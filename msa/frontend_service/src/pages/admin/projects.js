import React from 'react'
import { Button, Container } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { Link, useParams } from 'react-router-dom'

import api from '../../api'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'
import { degreeById, degrees } from '../../utilities/degreeDefinitions'
import { findFairs, getFairLabel } from '../../utilities/fairs'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'

class ProjectListing extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      projects: {}, // Map from PID to project
      projectsByEnid: new Map(), // Map from ENID to list of PIDs
      entityNameById: {}, // Map from ENID to entity name
      allEventsByEvid: {}, // Map from EVID to event
      popup: false,
      filters: {
        degrees: Object.values(degrees).map(degree => degree.id),
      },
    }
  }

  approvalStatus(project) {
    if (!project) {
      return
    }

    if (!project.evids || project.evids.length === 0) {
      return
    }

    const projectEvents = project.evids.map(evid => this.state.allEventsByEvid?.[evid])
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

  async componentDidMount() {
    const currentEvents = await api.event.getActive().exec()
    const currentEventEvids = currentEvents.map(event => event.evid)
    const allEventsByEvid = Object.fromEntries(currentEvents.map(event => [event.evid, event]))

    // Optimisation: Store student only once in state
    let projects = []

    for (const evid of currentEventEvids) projects = projects.concat(await api.project.getOfEvent(evid).exec())

    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

    const projectsByEnid = new Map()
    for (const project of Object.values(projects)) {
      if (!projectsByEnid.get(project.enid)) {
        projectsByEnid.set(project.enid, [project.pid])
      } else {
        projectsByEnid.get(project.enid).push(project.pid)
      }
    }

    const enids = Array.from(projectsByEnid.keys())

    const entities = await api.entity.getMultiple(enids).exec()

    const entityNameById = Object.fromEntries(entities.map(entity => [entity.enid, entity.name]))

    this.setState({ projects, projectsByEnid, entityNameById, allEventsByEvid })
  }

  renderProjectListing(projects) {
    if (projects.length <= 0) {
      return <p>No projects for this event</p>
    }

    return (
      <>
        <ProjectList>
          {projects.map(project => {
            const tags = project.tags.map(tag => ({ tag: tag.split('.')[1], tooltip: undefined }))

            project.degrees.forEach(id => {
              const tag = degreeById[id]
              tags.push({
                tag: tag.tag,
                tooltip: tag.tooltip,
              })
            })

            const fairLabel = getFairLabel(project.evids.map(evid => this.state.allEventsByEvid?.[evid]))

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
                headerBadge={
                  <>
                    {fairLabel && <Tag label={fairLabel} className='mr-2' />}
                    {this.approvalStatus(project)}
                  </>
                }
                headerButtons={
                  <Link to={`/project/${project.pid}/review`}>
                    <Button variant='primary'>Review</Button>
                  </Link>
                }
              />
            )
          })}
        </ProjectList>
      </>
    )
  }

  render() {
    return (
      <>
        <Container>
          {Object.keys(this.state.projects).length === 0 ? (
            <h4>No projects found</h4>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {Object.values(degrees).map(({ id, tag, tooltip }) => {
                  return (
                    <Tag
                      key={id}
                      label={tag}
                      tooltip={tooltip}
                      className='mr-2'
                      selectable={true}
                      selected={this.state.filters.degrees.includes(id)}
                      onClick={() => {
                        if (this.state.filters.degrees.includes(id)) {
                          this.setState({
                            filters: {
                              ...this.state.filters,
                              degrees: this.state.filters.degrees.filter(t => t !== id),
                            },
                          })

                          return
                        }

                        this.setState({
                          filters: { ...this.state.filters, degrees: [...this.state.filters.degrees, id] },
                        })
                      }}
                    />
                  )
                })}
              </div>

              {this.state.projectsByEnid?.entries &&
                Array.from(this.state.projectsByEnid.entries()).map(([enid, pids]) => {
                  const projects = pids
                    .map(pid => this.state.projects[pid])
                    .filter(project => {
                      if (!project) {
                        return false
                      }

                      return project.degrees?.some(degree => this.state.filters.degrees.includes(degree))
                    })

                  const entityName = this.state.entityNameById[enid]

                  return (
                    <>
                      <br />
                      <span className='d-flex justify-content-between'>
                        <h3 style={{ alignSelf: 'flex-end' }}>{entityName}</h3>
                      </span>
                      <hr style={{ marginTop: 0, marginBottom: '1.25em' }} />
                      {this.renderProjectListing(projects)}
                    </>
                  )
                })}
            </>
          )}
        </Container>

        {this.state.popup ? this.renderStudentModal() : null}
      </>
    )
  }
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
