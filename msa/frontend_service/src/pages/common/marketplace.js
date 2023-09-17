import likesIcon from 'bootstrap-icons/icons/heart.svg'
import likesFilledIcon from 'bootstrap-icons/icons/heart-fill.svg'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Col, Container, Form, Nav, Row, Tab } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { ViewportList } from 'react-viewport-list'

import api, { tags as allTags } from '../../api'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'
import * as session from '../../session'
import { degreeById, degrees } from '../../utilities/degreeDefinitions'
import { getFairLabel } from '../../utilities/fairs'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'
import './marketplace.scss'

const ProjectListing = props => {
  const [showHeadings, setShowHeadings] = useState(true)
  const [showTagFilters, setShowTagFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [votedProjects, setVotedProjects] = useState([])
  const [projectsByEnid, setProjectsByEnid] = useState(new Map())
  const [entityNameById, setEntityNameById] = useState({})
  const [allEventsByEvid, setAllEventsByEvid] = useState({})
  const [studentProgrammes, setStudentProgrammes] = useState([])
  const [studentFiltersSet, setStudentFiltersSet] = useState(false)
  const [filtersState, setFilters] = useState({
    search: '',
    degrees: session.getSessionData('filteredDegrees')
      ? JSON.parse(session.getSessionData('filteredDegrees'))
      : Object.values(degrees).map(degree => degree.id),
    tags: session.getSessionData('filteredTags') ? JSON.parse(session.getSessionData('filteredTags')) : [],
  })

  const [items, setItems] = useState([])

  const isStudent = props.isStudent

  const listRef = useRef(null)
  const listRefVoted = useRef(null)

  if (isStudent && studentProgrammes.length > 0 && !studentFiltersSet) {
    const studentDegrees = Object.values(degrees).filter(({programmeId}) => studentProgrammes.includes(programmeId)).map(({id}) => id)

    setFilters({
      ...filtersState,
      degrees: studentDegrees
    })
    setStudentFiltersSet(true)
  }

  const searchFilterFunction = (projects, filters) => {
    if (!filters.search) return projects

    return fuzzysort.go(filters.search, projects, { key: 'search', limit: 25, threshold: -5000 }).map(e => e.obj)
  }

  const tagFilterFunction = (projects, filters) => {
    if (filters.tags.length === 0) return projects

    console.log(projects.map(({ project }) => project.tags))

    return projects.filter(({ project }) => project.tags && project.tags.some(tag => filters.tags.includes(tag)))
  }

  const degreeFilterFunction = (projects, filters) => {
    if (filters.degrees.length === 0) return []

    return projects.filter(
      ({ project }) =>
        !project.degrees || project.degrees.some(degree => filters.degrees.includes(degree.replace(' ', '')))
    )
  }

  const filter = useCallback(
    (filters, allProjects = items) => {
      const filteredEntities = [searchFilterFunction, degreeFilterFunction, tagFilterFunction].reduce(
        (projects, filterFunction) => filterFunction(projects, filters),
        allProjects
      )

      setFilteredProjects(filteredEntities)
    },
    [items]
  )

  const search = searchFilter => {
    if (searchFilter === filtersState.search) return

    if (searchFilter === '' || searchFilter === null) {
      const filters = { ...filtersState, search: '' }

      setFilters(filters)
      filter(filters)
      return
    }

    const filters = { ...filtersState, search: searchFilter }

    setFilters(filters)
    filter(filters)
  }

  const sortProjects = (a, b) => {
    if (a.entityName < b.entityName) return -1
    if (a.entityName > b.entityName) return 1

    if (a.project.name < b.project.name) return -1
    return 1
  }

  const addVoteOnProject = project_id => {
    try {
      const uid = api.getApiTokenData().uid
      api.votes.add(uid, project_id).exec()
      setVotedProjects([...votedProjects, project_id])
    } catch (error) {
      console.log(error)
    }
  }

  const removeVoteOnProject = project_id => {
    try {
      const uid = api.getApiTokenData().uid
      api.votes.remove(uid, project_id).exec()
      setVotedProjects(votedProjects.filter(pid => pid !== project_id))
    } catch (error) {
      console.log(error)
    }
  }

  // const hideProject = project_id => {
  //   api.votes.hide(project_id)
  // }

  const renderText = ({ text }) => (
    <div key={text}>
      <span className='d-flex justify-content-between'>
        <p style={{ alignSelf: 'flex-end' }}>{text}</p>
      </span>
    </div>
  )

  const renderHeader = ({ title }) => (
    <div key={title}>
      <br />
      <span className='d-flex justify-content-between'>
        <h3 style={{ alignSelf: 'flex-end' }}>{title}</h3>
      </span>
      <hr style={{ marginTop: 0, marginBottom: '1.25em' }} />
    </div>
  )

  const renderProject = ({ entityName, project }, isVotedList) => {
    if (isVotedList && !votedProjects.includes(project.pid)) return
    if (!isVotedList && votedProjects.includes(project.pid)) return

    const tags = (project.tags || []).map(tag => ({ tag: tag.split('.')[1], tooltip: undefined })) || []

    project.degrees.forEach(id => {
      const tag = degreeById[id]

      const tagExists = !!tags.find(t => t.tag === tag.tag)

      if (!tagExists) {
        tags.push({
          tag: tag.tag,
          tooltip: tag.tooltip,
        })
      }
    })

    let fairLabel
    if (allEventsByEvid) fairLabel = getFairLabel(project.evids.map(evid => allEventsByEvid?.[evid])) || 'Marketplace'

    return (
      <ProjectList.Item
        key={project.pid}
        eventKey={project.pid}
        description={project.description}
        expectations={project.expectations}
        environment={project.environment}
        tags={tags}
        name={showHeadings && !isVotedList ? project.name : `${entityName} - ${project.name}`}
        email={project.email}
        numberOfStudents={project.numberOfStudents}
        notInList={true}
        headerBadge={
          fairLabel && (
            <Tag
              label={fairLabel}
              tooltip={
                fairLabel === 'Marketplace only' ? 'This project will NOT appear at any Thesis Fairs.' : undefined
              }
            />
          )
        }
        headerButtons={
          isStudent && (
            <Button
              variant='primary'
              onClick={() => {
                if (isVotedList) {
                  removeVoteOnProject(project.pid)
                } else {
                  addVoteOnProject(project.pid)
                }
              }}
              style={{ width: 'max-content', marginLeft: '0.75rem', padding: '0.375rem' }}
            >
              <img
                src={isVotedList ? likesFilledIcon : likesIcon}
                style={{ width: '1.5rem', height: '1.5rem', filter: 'invert()' }}
                alt={isVotedList ? 'unvote' : 'vote'}
              />
            </Button>
          )
        }
      />
    )
  }

  const renderItem = ({ type, ...properties }, isVotedList) => {
    switch (type) {
      case 'text':
        return renderText(properties)
      case 'header':
        return renderHeader(properties)
      case 'project':
        return renderProject(properties, isVotedList)
      default:
        return
    }
  }

  useEffect(() => {
    const nameToProgrammeId = name => {
      if (name.startsWith("Master")) {
        return {
          "Master Software Engineering": "MScSE",
          "Master Artificial Intelligence": "MScAI",
          "Master Computer Science (joint degree)": "MScCS",
          "Master Computer Science": "MScCS",
          "Master Computational Science (joint degree)": "MScCLSJD",
          "Master Computational Science": "MScCLSJD",
          "Master Information Studies": "MScIS",
          "Master Logic": "MScLogic",
          "Master Software Engineering": "MScSE",
        }[name]
      }

      return name
    }

    const fetchStudentDegrees = async () => {
      const {studies} = await api.user.get(api.getApiTokenData().uid, {studies: true}).exec()
      const programmes = studies.map(nameToProgrammeId)
      setStudentProgrammes(programmes || [])
    }

    if (studentProgrammes.length == 0 && isStudent) fetchStudentDegrees()
  })

  useEffect(() => {
    const fetchMarketplace = async () => {
      const { entities, events, projects } = await api.project.marketplace()

      const allEventsByEvid = Object.fromEntries(events.map(event => [event.evid, event]))
      setAllEventsByEvid(allEventsByEvid)

      const projectsByPid = Object.fromEntries(projects.map(project => [project.pid, project]))
      setProjects(projectsByPid)

      const projectsByEnid = projects.reduce((accumulator, project) => {
        const entitysProjects = accumulator.get(project.enid)

        if (!entitysProjects) accumulator.set(project.enid, [project.pid])
        else entitysProjects.push(project.pid)

        return accumulator
      }, new Map())

      setProjectsByEnid(projectsByEnid)

      const entityNameById = Object.fromEntries(entities.map(entity => [entity.enid, entity.name]))
      setEntityNameById(entityNameById)

      if (isStudent) {
        try {
          const uid = api.getApiTokenData().uid
          const votes = (await api.votes.getOfStudent(uid).exec()) || []
          setVotedProjects(votes)
        } catch (error) {
          console.log(error)
        }
      }

      setLoadingData(false)
    }

    if (loadingData) fetchMarketplace()
  }, [isStudent, loadingData])

  useEffect(() => {
    if (!projectsByEnid?.entries) return
    if (!loading || loadingData) return

    const newItems = Array.from(projectsByEnid.entries())
      .map(([enid, pids]) => {
        const entityProjects = pids.map(pid => projects[pid])

        if (entityProjects.length === 0) {
          return []
        }

        const entityName = entityNameById[enid]

        return entityProjects.map(project => ({
          type: 'project',
          project,
          entityName,
          search: `${entityName} - ${project.name}`,
        }))
      })
      .flat()
      .sort(sortProjects)

    setItems(newItems)
    filter(filtersState, newItems)
    setLoading(false)
  }, [entityNameById, filter, filtersState, loading, loadingData, projects, projectsByEnid])

  const showNoProjectsIfRequired = (items, isVotedList) => {
    const projects = isVotedList
      ? items.filter(({ project }) => votedProjects.includes(project.pid))
      : items.filter(({ project }) => !votedProjects.includes(project.pid))

    if (projects.length === 0) {
      return [{ type: 'text', text: isVotedList ? 'You have not voted for any project' : 'No projects found' }]
    }

    return projects
  }

  const addHeaders = items => {
    if (!showHeadings) return items

    return items.reduce((accumulator, nextItem) => {
      const [previousItem] = accumulator ? accumulator.slice(-1) : [undefined]

      if (!previousItem || !('entityName' in previousItem) || previousItem.entityName !== nextItem.entityName)
        accumulator.push({ type: 'header', title: nextItem.entityName })
      accumulator.push(nextItem)

      return accumulator
    }, [])
  }

  return (
    <>
      <Container style={{ display: 'flex', flexGrow: '1', flexDirection: 'column' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
          <Button
            style={{ marginBottom: '0.75rem', marginRight: '0.75rem' }}
            variant='primary'
            onClick={() => setShowHeadings(!showHeadings)}
          >
            {showHeadings ? 'Hide headings' : 'Show headings'}
          </Button>
          <Button
            style={{ marginBottom: '0.75rem' }}
            variant='primary'
            onClick={() => setShowTagFilters(!showTagFilters)}
          >
            {showTagFilters ? 'Hide tag filters' : 'Show tag filters'}
            {filtersState.tags.length > 0 ? ` (${filtersState.tags.length})` : ''}
          </Button>
          {!api.getApiTokenData() && (
            <Link to='/'>
              <Button style={{ marginBottom: '0.75rem', marginLeft: '0.75rem' }} variant='primary'>
                Back to Login
              </Button>
            </Link>
          )}
        </div>

        {showTagFilters ? (
          <div className='tag-filtering'>
            <Form.Group className='mb-3 tags' controlId='tags'>
              <Form.Label>Filter on tags</Form.Label>
              <Row>
                <Tab.Container id='left-tabs-example' defaultActiveKey={Object.keys(allTags)[0]}>
                  <Col xs='3'>
                    <Form.Label>Category</Form.Label>
                    <Nav variant='pills' className='tag-category'>
                      {Object.keys(allTags).map(category => (
                        <Nav.Item key={category} className='tag-category__item'>
                          <Nav.Link eventKey={category}>{category}</Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </Col>
                  <Col>
                    <Form.Label>Tags</Form.Label>
                    <Tab.Content>
                      {Object.entries(allTags).map(([category, tags]) => (
                        <Tab.Pane eventKey={category} key={category} className='selectable-tags'>
                          {tags.map(tag => (
                            <Form.Check className='form-tag selectable-tag' inline key={`${category}.${tag}`}>
                              <Form.Check.Input
                                name={`${category}.${tag}`}
                                key={`${category}.${tag}`}
                                className='form-tag__checkbox'
                                checked={filtersState.tags.includes(`${category}.${tag}`)}
                                onChange={() => {}}
                              />
                              <Form.Check.Label>
                                <Tag
                                  label={tag}
                                  id={`${category}.${tag}`}
                                  selectable={true}
                                  selected={filtersState.tags.includes(`${category}.${tag}`)}
                                  onClick={() => {
                                    const tagId = `${category}.${tag}`
                                    let filteredTags = [...filtersState.tags, tagId]

                                    if (filtersState.tags.includes(tagId))
                                      filteredTags = filteredTags.filter(t => t !== tagId)

                                    const filters = { ...filtersState, tags: filteredTags }

                                    setFilters(filters)
                                    filter(filters)
                                    session.setSessionData('filteredTags', JSON.stringify(filters.tags))
                                  }}
                                />
                              </Form.Check.Label>
                            </Form.Check>
                          ))}
                        </Tab.Pane>
                      ))}
                    </Tab.Content>
                  </Col>
                </Tab.Container>
                <Col>
                  <Form.Label>Currently selected</Form.Label>
                  <div className='selected-tags'>
                    {filtersState.tags.map(tag => (
                      <Tag
                        label={tag.split('.')[1]}
                        id={tag}
                        key={tag}
                        selectable={true}
                        selected={true}
                        onClick={() => {
                          const filteredTags = filtersState.tags.filter(t => t !== tag)
                          const filters = { ...filtersState, tags: filteredTags }

                          setFilters(filters)
                          filter(filters)
                          session.setSessionData('filteredTags', JSON.stringify(filters.tags))
                        }}
                      />
                    ))}
                  </div>
                </Col>
              </Row>

              <br />
            </Form.Group>
          </div>
        ) : (
          <div className='selected-tags selected-tags--stand-alone'>
            {filtersState.tags.map(tag => (
              <Tag
                label={tag.split('.')[1]}
                id={tag}
                key={tag}
                selectable={true}
                selected={true}
                onClick={() => {
                  const filteredTags = filtersState.tags.filter(t => t !== tag)
                  const filters = { ...filtersState, tags: filteredTags }

                  setFilters(filters)
                  filter(filters)
                  session.setSessionData('filteredTags', JSON.stringify(filters.tags))
                }}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {Object.values(degrees).map(({ id, tag, tooltip }) => {
            return (
              <Tag
                key={id}
                label={tag}
                tooltip={tooltip}
                selectable={true}
                selected={filtersState.degrees.includes(id)}
                onClick={() => {
                  if (isStudent)
                    return

                  let filteredDegrees = [...filtersState.degrees, id]

                  if (filtersState.degrees.includes(id)) {
                    filteredDegrees = filtersState.degrees.filter(t => t !== id)
                  }

                  const filters = { ...filtersState, degrees: filteredDegrees }

                  setFilters(filters)
                  filter(filters)
                  session.setSessionData('filteredDegrees', JSON.stringify(filteredDegrees))
                }}
              />
            )
          })}
        </div>

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control type='text' placeholder='Search projects' onInput={e => search(e.target.value)} />
          </Form.Group>
        </Form>

        {loading ? (
          <h4>Loading...</h4>
        ) : (
          <div className='project-lists-container scrollable-page' style={{ flexGrow: '1', height: '1px' }}>
            <div className='project-lists' ref={listRef} style={{ overflowY: 'auto' }}>
              <ViewportList
                viewportRef={listRef}
                items={addHeaders(showNoProjectsIfRequired(filteredProjects))}
                itemMinSize={48}
                initialPrerender={32}
              >
                {item => renderItem(item)}
              </ViewportList>
            </div>
            {isStudent && (
              <div className='project-lists' ref={listRefVoted} style={{ marginTop: '1.5rem', overflowY: 'auto' }}>
                <ViewportList
                  viewportRef={listRefVoted}
                  items={[
                    { type: 'header', title: 'Projects you have voted on' },
                    ...showNoProjectsIfRequired(items, true),
                  ]}
                  itemMinSize={48}
                  initialPrerender={32}
                >
                  {item => renderItem(item, true)}
                </ViewportList>
              </div>
            )}
          </div>
        )}
      </Container>

      {/* {state.popup ? renderStudentModal() : null} */}
    </>
  )
}

class Projects extends React.Component {
  render = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh' }}>
      <Container className='mt-4'>
        <div className='mb-4'>
          <h1>Project Marketplace</h1>
          <p>
            This page shows the project for all upcoming Thesis Fairs, as well as the projects that have been
            specifically put onto the marketplace.
          </p>
        </div>
      </Container>
      <ProjectListing {...this.props} />
    </div>
  )
}

function Marketplace(props) {
  const params = useParams()

  return <Projects {...props} params={params} />
}

export default Marketplace
