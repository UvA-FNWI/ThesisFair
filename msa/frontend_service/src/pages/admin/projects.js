import React from 'react'

import { Container, Badge, Button } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams, Link } from 'react-router-dom'
import api from '../../api'

import '../representative/projects.scss'
import '../../components/projectListItem/projectListItem.scss'
import ProjectList from '../../components/projectListRep/projectList'
import Tag from '../../components/tag/tag'

import { degreeById } from '../../definitions'

class ProjectListing extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      projects: {}, // Map from PID to project
      projectsByEnid: new Map(), // Map from ENID to list of PIDs
      entityNameById: {}, // Map from ENID to entity name
      popup: false,
    }
  }

  approvalBadge(project) {
    if (!project) {
      return
    }

    if (!project.evids || project.evids.length === 0) {
      return
    }

    if (!this.state?.events?.[project.evid]?.enabled) {
      return
    }

    switch (project.approval) {
      case 'rejected':
        return <Badge variant='danger'>Rejected</Badge>
      case 'awaiting':
        return <Badge variant='warning'>Awaiting approval</Badge>
      case 'partially-approved':
        return <Badge variant='warning'>Awaiting approval</Badge>
      case 'payment':
        return <Badge variant='warning'>Awaiting payment</Badge>
      case 'approved':
        return <Badge variant='success'>Approved</Badge>
      default:
        return
    }
  }

  async componentDidMount() {
    const currentEvents = await api.event.getActive().exec()
    const currentEventEvids = currentEvents.map(event => event.evid)

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

    this.setState({ projects, projectsByEnid, entityNameById })
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

            const entityName = this.state.entityNameById[project.enid]

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
                headerBadge={this.approvalBadge(project)}
                headerButtons={<>
                  <Link to={`/project/${project.pid}/review`}>
                    <Button variant='primary'>Review</Button>
                  </Link>
                  <Tag label={entityName} />
                </>}
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
          {Object.keys(this.state.projects).length === 0 ? <h4>No projects found</h4> : null}

          {/* Map over each enid and create a list of projects */}
          {this.state.projectsByEnid?.entries &&
            Array.from(this.state.projectsByEnid.entries()).map(([enid, pids]) => {
              const projects = pids.map(pid => this.state.projects[pid])

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
