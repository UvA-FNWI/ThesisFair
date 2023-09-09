import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Container, Form } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import { ViewportList } from 'react-viewport-list'

import api from '../../api'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'
import * as session from '../../session'
import { degreeById, degrees } from '../../utilities/degreeDefinitions'
import { getFairLabel } from '../../utilities/fairs'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'

const ProjectListing = props => {
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [projectsByEnid, setProjectsByEnid] = useState(new Map())
  const [entityNameById, setEntityNameById] = useState({})
  const [allEventsByEvid, setAllEventsByEvid] = useState({})
  const [filtersState, setFilters] = useState({
    search: '',
    degrees: session.getSessionData('filteredDegrees')
      ? JSON.parse(session.getSessionData('filteredDegrees'))
      : Object.values(degrees).map(degree => degree.id),
  })
  const [items, setItems] = useState([])

  const isLoggedIn = props.isLoggedIn

  const listRef = useRef(null)

  const searchFilterFunction = (projects, filters) => {
    if (!filters.search) return projects

    return fuzzysort.go(filters.search, projects, { key: 'project.title', limit: 25, threshold: -5000 }).map(e => e.obj)
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
      const filteredEntities = [searchFilterFunction, degreeFilterFunction].reduce(
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
    if (a.title < b.title) return -1
    return 1
  }

  const addVoteOnProject = project_id => {
    api.votes.add(project_id)
  }

  const removeVoteOnProject = project_id => {
    api.votes.remove(project_id)
  }

  const hideProject = project_id => {
    api.votes.hide(project_id)
  }

  const renderHeader = ({ title }) => (
    <div key={title}>
      <br />
      <span className='d-flex justify-content-between'>
        <h3 style={{ alignSelf: 'flex-end' }}>{title}</h3>
      </span>
      <hr style={{ marginTop: 0, marginBottom: '1.25em' }} />
    </div>
  )

  const renderProject = ({ entityName, project }) => {
    const tags = (project.tags || []).map(tag => ({ tag: tag.split('.')[1], tooltip: undefined })) || []

    project.degrees.forEach(id => {
      const tag = degreeById[id]
      tags.push({
        tag: tag.tag,
        tooltip: tag.tooltip,
      })
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
        name={`${entityName} - ${project.name}`}
        email={project.email}
        numberOfStudents={project.numberOfStudents}
        notInList={true}
        headerBadge={fairLabel && <Tag label={fairLabel} />}
        headerButtons={
          isLoggedIn && (
            <Button
              variant='primary'
              onClick={() => {
                addVoteOnProject(project.pid)
              }}
              style={{ width: 'max-content', marginLeft: '0.75rem' }}
            >
              Add to list
            </Button>
          )
        }
      />
    )
  }

  const renderItem = ({ type, ...properties }) => {
    switch (type) {
      case 'header':
        return renderHeader(properties)
      case 'project':
        return renderProject(properties)
      default:
        return
    }
  }

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

      setLoadingData(false)
    }

    if (loadingData) fetchMarketplace()
  }, [loadingData])

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
        }))
      })
      .flat()
      .sort(sortProjects)

    setItems(newItems)
    filter(filtersState, newItems)
    setLoading(false)
  }, [entityNameById, filter, filtersState, loading, loadingData, projects, projectsByEnid])

  const showNoProjectsIfRequired = items => {
    if (items.length === 0) {
      return [{ type: 'header', title: 'No projects found' }]
    }

    return items
  }

  return (
    <>
      <Container>
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
          <div
            className='project-lists'
            ref={listRef}
            style={{ maxHeight: '70vh', marginTop: '1.5rem', overflowY: 'auto' }}
          >
            <ViewportList
              viewportRef={listRef}
              items={showNoProjectsIfRequired(filteredProjects)}
              itemMinSize={48}
              initialPrerender={32}
            >
              {item => renderItem(item)}
            </ViewportList>
          </div>
        )}
      </Container>

      {/* {state.popup ? renderStudentModal() : null} */}
    </>
  )
}

class Projects extends React.Component {
  render = () => (
    <div>
      <Container className='mt-4'>
        <div className='mb-4'>
          <h1>Projects for upcoming events</h1>
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
