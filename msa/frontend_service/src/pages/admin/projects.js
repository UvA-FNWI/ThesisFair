import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Container, Form } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { ViewportList } from 'react-viewport-list'

import api, { downloadProjectCSV } from '../../api'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'
import * as session from '../../session'
import { degreeById, degrees, degreeTagById } from '../../utilities/degreeDefinitions'
import { findFairs, getFairLabel } from '../../utilities/fairs'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'

function humanizeApproval(approval, isAdmin) {
  switch (approval) {
    case 'preliminary':
    case 'approved':
      if (isAdmin) return 'Partially approved'
      else return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'commented':
      return 'Changes requested'
    default:
      return 'Awaiting approval'
  }
}

function approvalToUIClass(approval) {
  switch (approval) {
    case 'preliminary':
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'commented':
      return 'changes'
    default:
      return 'awaiting'
  }
}

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
    degrees: session.getSessionData('reviewingDegrees')
      ? JSON.parse(session.getSessionData('reviewingDegrees'))
      : Object.values(degrees).map(degree => degree.id),
  })
  const [items, setItems] = useState([])

  const isAcademic = props.isAcademic || false

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

  const approvalStatus = project => {
    if (!project) {
      return
    }

    if (!project.evids || project.evids.length === 0) {
      return
    }

    const projectEvents = project.evids.map(evid => allEventsByEvid?.[evid])
    const fairs = findFairs(projectEvents)

    if (fairs.length === 0) {
      return
    }

    const tags = []

    // Admin approval tag
    if (!isAcademic) {
      tags.push(
        <Tag
          className={`mr-2 tag--approval-${approvalToUIClass(project.approval)}`}
          label={`Admin: ${humanizeApproval(project.approval, true)}`}
        />
      )
    }

    for (const degree of project.degrees.filter(e => filtersState.degrees.includes(e))) {
      const approval = project.academicApproval.find(e => e.degree === degree)?.approval
      tags.push(
        <Tag
          className={`mr-2 tag--approval-${approvalToUIClass(approval)}`}
          label={`${degreeTagById[degree]}: ${humanizeApproval(approval)}`}
        />
      )
    }

    return <>{tags}</>
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

  const renderProject = ({ project }) => {
    const tags = project.tags.map(tag => ({ tag: tag.split('.')[1], tooltip: undefined }))

    project.degrees.forEach(id => {
      const tag = degreeById[id]
      tags.push({
        tag: tag.tag,
        tooltip: tag.tooltip,
      })
    })

    const fairLabel = getFairLabel(project.evids.map(evid => allEventsByEvid?.[evid]))

    return (
      <ProjectList.Item
        key={project.pid}
        eventKey={project.pid}
        description={project.description}
        expectations={project.expectations}
        environment={project.environment}
        tags={tags}
        name={project.title}
        email={project.email}
        numberOfStudents={project.numberOfStudents}
        notInList={true}
        headerBadge={
          <>
            {fairLabel && <Tag label={fairLabel} />}
            {approvalStatus(project)}
          </>
        }
        headerButtons={
          <Link to={`/project/${project.pid}/review`}>
            <Button variant='primary' style={{ width: 'max-content', marginLeft: '0.75rem' }}>
              Review
            </Button>
          </Link>
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
    const fetchAndSetData = async () => {
      const currentEvents = await api.event.getActive().exec()
      const currentEventEvids = currentEvents.map(event => event.evid)
      const allEventsByEvid = Object.fromEntries(currentEvents.map(event => [event.evid, event]))

      setAllEventsByEvid(allEventsByEvid)

      // Optimisation: Store student only once in state
      let projects = []

      for (const evid of currentEventEvids) projects = projects.concat(await api.project.getOfEvent(evid).exec())

      projects = Object.fromEntries(
        projects
          // .filter(project => isAdmin || academicApprovalStates.includes(project.approval))
          .map(project => [project.pid, project])
      )
      setProjects(projects)

      const projectsByEnid = new Map()
      for (const project of Object.values(projects)) {
        if (!projectsByEnid.get(project.enid)) {
          projectsByEnid.set(project.enid, [project.pid])
        } else {
          projectsByEnid.get(project.enid).push(project.pid)
        }
      }

      setProjectsByEnid(projectsByEnid)

      const enids = Array.from(projectsByEnid.keys())

      const entities = await api.entity.getMultiple(enids).exec()

      const entityNameById = Object.fromEntries(entities.map(entity => [entity.enid, entity.name]))
      setEntityNameById(entityNameById)

      setLoadingData(false)
    }

    if (loadingData) fetchAndSetData()
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

        return entityProjects
          .map(project => ({ ...project, title: `${entityName} - ${project.name}` }))
          .map(project => ({
            type: 'project',
            project,
            title: `${entityName} - ${project.name}`,
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
                  if (isAcademic) {
                    const filters = { ...filtersState, degrees: [id] }

                    setFilters(filters)
                    filter(filters)

                    session.setSessionData('reviewingDegrees', JSON.stringify([id]))
                    return
                  }

                  if (filtersState.degrees.includes(id)) {
                    const filteredDegrees = filtersState.degrees.filter(t => t !== id)
                    const filters = { ...filtersState, degrees: filteredDegrees }

                    setFilters(filters)
                    filter(filters)

                    session.setSessionData('reviewingDegrees', JSON.stringify(filteredDegrees))
                    return
                  }

                  const filteredDegrees = [...filtersState.degrees, id]

                  const filters = { ...filtersState, degrees: filteredDegrees }

                  setFilters(filters)
                  filter(filters)

                  session.setSessionData('reviewingDegrees', JSON.stringify(filteredDegrees))
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
          <Button onClick={() => downloadProjectCSV()}>CSV download</Button>
        </div>
      </Container>
      <ProjectListing {...this.props} />
    </div>
  )
}

function ProjectsWithParams(props) {
  const params = useParams()

  return <Projects {...props} params={params} />
}

export default ProjectsWithParams
