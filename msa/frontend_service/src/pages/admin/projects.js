import React, { useEffect, useRef, useState } from 'react'
import { Button, Container } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { Link, useParams } from 'react-router-dom'
import { ViewportList } from 'react-viewport-list'

import api from '../../api'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'
import { degreeById, degrees } from '../../utilities/degreeDefinitions'
import { findFairs, getFairLabel } from '../../utilities/fairs'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'

const ProjectListing = () => {
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [projects, setProjects] = useState([])
  const [projectsByEnid, setProjectsByEnid] = useState(new Map())
  const [entityNameById, setEntityNameById] = useState({})
  const [allEventsByEvid, setAllEventsByEvid] = useState({})
  const [filters, setFilters] = useState({
    degrees: Object.values(degrees).map(degree => degree.id),
  })
  const [items, setItems] = useState([])

  const listRef = useRef(null)

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

    switch (project.approval) {
      case 'rejected':
        return <Tag className='mr-2 tag--approval-rejected' label='Rejected' />
      case 'commented':
        return <Tag className='mr-2 tag--approval-changes' label='Changes requested' />
      case 'awaiting':
        return <Tag className='mr-2 tag--approval-awaiting' label='Awaiting approval' />
      case 'preliminary':
        if (api.getApiTokenData().type === 'a')
          return <Tag className='mr-2 tag--approval-awaiting' label='Awaiting Academic Approval' />
        return <Tag className='mr-2 tag--approval-awaiting' label='Awaiting approval' />
      case 'payment':
        return <Tag className='mr-2 tag--approval-payment' label='Awaiting payment' />
      case 'approved':
        return <Tag className='mr-2 tag--approval-approved' label='Approved' />
      default:
        return
    }
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
        name={project.name}
        email={project.email}
        numberOfStudents={project.numberOfStudents}
        notInList={true}
        headerBadge={
          <>
            {fairLabel && <Tag label={fairLabel} className='mr-2' />}
            {approvalStatus(project)}
          </>
        }
        headerButtons={
          <Link to={`/project/${project.pid}/review`}>
            <Button variant='primary'>Review</Button>
          </Link>
        }
      />
    )
  }

  const renderItem = ({ type, ...properties }) => {
    switch (type) {
      case 'header':
        console.log('Rendering header')
        return renderHeader(properties)
      case 'project':
        console.log('Rendering project')
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

      projects = Object.fromEntries(projects.map(project => [project.pid, project]))
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

        return [
          {
            type: 'header',
            title: entityName,
            degrees: entityProjects.map(project => project.degrees).flat(),
          },
          ...entityProjects.map(project => ({
            type: 'project',
            project,
            degrees: project.degrees,
          })),
        ]
      })
      .flat()

    setItems(newItems)
    setLoading(false)
  }, [entityNameById, filters.degrees, loading, loadingData, projects, projectsByEnid])

  const filterDegrees = item => {
    console.log('Filtering degrees')
    return filters.degrees.some(id => item.degrees.includes(id))
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
                className='mr-2'
                selectable={true}
                selected={filters.degrees.includes(id)}
                onClick={() => {
                  if (filters.degrees.includes(id)) {
                    setFilters({ ...filters, degrees: filters.degrees.filter(t => t !== id) })

                    return
                  }

                  setFilters({ ...filters, degrees: [...filters.degrees, id] })
                }}
              />
            )
          })}
        </div>
        {loading ? (
          <h4>Loading...</h4>
        ) : (
          <div className='project-lists' ref={listRef}>
            <ViewportList
              viewportRef={listRef}
              items={items.filter(filterDegrees) || [{ type: 'header' }]}
              itemMinSize={48}
              initialPrerender={32}
            >
              {item => renderItem(item)}
            </ViewportList>
          </div>
        )}
      </Container>
      {console.log('Finished rendering')}

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
      <ProjectListing params={{ ...this.props.params }} />
    </div>
  )
}

function ProjectsWithParams(props) {
  const params = useParams()

  return <Projects {...props} params={params} />
}

export default ProjectsWithParams
