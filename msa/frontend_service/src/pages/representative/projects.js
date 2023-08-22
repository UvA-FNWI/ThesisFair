import React from 'react'
import { Badge, Button, Container, OverlayTrigger, Tooltip } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'

import api, { downloadCV } from '../../api'
import ProjectEditor from '../../components/projectEditor/projectEditor'
import ProjectList from '../../components/projectListRep/projectList'
import StudentPopup from '../../components/studentPopup/studentPopup'
import * as session from '../../session'
import { degreeById } from '../../utilities/degreeDefinitions'

import './projects.scss'
import '../../components/projectListItem/projectListItem.scss'

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`

const projectButtons = (project, duplicateProject, isInActiveEvent, edit, isInOldEvent) => {
  return (
    <>
      <OverlayTrigger overlay={<Tooltip>Duplicate this project for the current ThesisFair event</Tooltip>}>
        <Button
          size='sm'
          variant='outline-primary'
          className='ms-2 cv-button'
          onClick={e => {
            e.stopPropagation()
            duplicateProject(project, isInActiveEvent)
          }}
        >
          Duplicate
        </Button>
      </OverlayTrigger>
      <ProjectEditorTrigger params={{ ...project, edit: edit, isInOldEvent: isInOldEvent }} />
      {/* TODO: Implement CV downloading (stage 3) */}
      {/* <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
        <Button
          size='sm'
          variant='outline-primary'
          className='ms-2 cv-button'
          onClick={e => {
            e.stopPropagation()
            this.downloadAllCVs(project)
          }}
        >
          <img className='cv-button__image' src={downloadIcon} alt='download' />
        </Button>
      </OverlayTrigger> */}
    </>
  )
}

class ProjectListing extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      projects: {}, // Map from PID to project
      votes: {}, // Map from PID to users that voted for it
      events: {}, // Map from EVID to event info
      eventProjects: {}, // Map (actual map object) from list of EVIDs to list of PIDs
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
    // Optimisation: Store student only once in state
    let projects = await api.project.getOfEntity(null, session.getEnid()).exec()
    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

    // Get the votes of this entity as a list of [pid, uid] pairs
    let votes = await api.votes.getOfEntity(session.getEnid(), null).exec()
    // Reduce the uids into lists, indexed by these pids ({pid: [uid, uid, ...], ...})
    votes = votes.reduce((c, vote) => ({ ...c, [vote.pid]: [...(c[vote.pid] || []), vote.uid] }), {})
    // Call 'getMultiple(uids)' for user info on these lists
    // TODO: remove this loop with api calls
    for (const [pid, uids] of Object.entries(votes)) {
      votes[pid] = await api.user.getMultiple(uids).exec()
    }

    const eventProjects = new Map()
    for (const project of Object.values(projects)) {
      // Make sure events with a null evid and no evids are both mapped
      // to the same thing (A)
      if (!project.evids || (project.evids && !project.evids[0])) {
        project.evids = [null]
      }

      if (!eventProjects.get(JSON.stringify(project.evids))) {
        eventProjects.set(JSON.stringify(project.evids), [project.pid])
      } else {
        eventProjects.get(JSON.stringify(project.evids)).push(project.pid)
      }
    }

    // Find info for every event
    const events = {}
    // TODO: remove this loop with api calls
    for (const evid of [...new Set(Array.from(eventProjects.keys()).map(JSON.parse).flat())]) {
      // If there is a null event (from (A) above), give it a fitting name
      events[evid] = evid ? await api.event.get(evid).exec() : { name: 'No event' }
    }

    this.setState({ projects, votes, events, eventProjects })
  }

  renderStudentModal = () => {
    const { pid, uid } = this.state.popup
    const student = this.state.votes[pid].find(user => user.uid === uid)

    return <StudentPopup student={student} onHide={() => this.setState({ popup: false })} />
  }

  downloadAllCVs = async project => {
    for (const student of this.state.votes[project.pid]) {
      await downloadCV(student.uid, genCVName(student, project))
    }
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

            const projectEvents = project.evids?.map(evid => this.state.events[evid] || { enabled: false })
            const isInActiveEvent = projectEvents.some(event => event.enabled)
            const isInEvent = project.evids?.length > 0

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
                headerButtons={projectButtons(
                  project,
                  this.props.params.duplicateProject,
                  isInEvent && isInActiveEvent,
                  this.props.params.edit,
                  isInEvent && !isInActiveEvent
                )}
              />
            )
          })}
        </ProjectList>
        {/* TODO: Implement student interest list (stage 3) */}
        {/* {this.state.votes[project.pid] ? (
          this.state.votes[project.pid].length > 0 ? (
            this.state.votes[project.pid].map(student => {
              const studentInfoPresent = student.firstname || student.lastname || student.studies.length > 0
              return (
                <Card
                  key={student.uid}
                  className='mb-2 hoverable'
                  bg={studentInfoPresent ? 'white' : 'gray'}
                  onClick={
                    studentInfoPresent
                      ? e => this.setState({ popup: { pid: project.pid, uid: student.uid, cv: false } })
                      : null
                  }
                >
                  <Card.Body className='d-flex justify-content-between align-items-center'>
                    {studentInfoPresent ? (
                      <>
                        <p className='m-0'>
                          {student.firstname} {student.lastname}
                          <span className='d-none d-sm-inline ps-2 pe-2'>-</span>
                          <span className='d-none d-sm-inline'>{student.studies.join(' | ')}</span>
                        </p>
                        <div>
                          <OverlayTrigger overlay={<Tooltip>Download CV from student</Tooltip>}>
                            <Button
                              size='sm'
                              variant='outline-primary'
                              className='cv-button'
                              onClick={e => {
                                e.stopPropagation()
                                downloadCV(student.uid, genCVName(student, project))
                              }}
                            >
                              <img className='cv-button__image' src={downloadIcon} alt='download' />
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </>
                    ) : (
                      <p className='m-0'>Student has not logged in yet</p>
                    )}
                  </Card.Body>
                </Card>
              )
            })
          ) : (
            <h6>
              <em>No students have voted for this project.</em>
            </h6>
            )
          ) : null} */}
      </>
    )
  }

  // Takes a list of evids, returns their earliest event
  earliestEvent = events => {
    return events
      .map(event => this.state.events[event])
      .reduce((first, event) => (event.start < first.start ? event : first))
  }

  render() {
    const sortedEventProjectsEntries = this.state.eventProjects.entries
      ? Array.from(this.state.eventProjects.entries())
      : []

    sortedEventProjectsEntries.sort(([a], [b]) => {
      a = this.earliestEvent(JSON.parse(a)).start
      b = this.earliestEvent(JSON.parse(b)).start

      if (!a) return 1
      if (!b) return -1

      return a < b ? 1 : -1
    })

    return (
      <>
        <Container>
          {Object.keys(this.state.projects).length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          {sortedEventProjectsEntries.map(([evids, pids]) => {
            const projects = pids.map(pid => this.state.projects[pid])

            const events = JSON.parse(evids).map(evid => this.state.events[evid])

            return (
              <>
                <br />
                <span className='d-flex justify-content-between'>
                  <h3 style={{ alignSelf: 'flex-end' }}>{events.map(event => event.name).join(' & ')}</h3>
                  {events.map(event => (
                    <time key={event.evid} style={{ alignSelf: 'flex-end' }} dateTime={event.start}>
                      {event.start ? new Date(event.start).toLocaleDateString() : ''}
                    </time>
                  ))}
                </span>
                <hr style={{ marginTop: 0, marginBottom: '1.25em' }} />
                {this.renderProjectListing(projects, events)}
              </>
            )
          })}
        </Container>

        {this.state.popup ? this.renderStudentModal() : null}
      </>
    )
  }
}

class ProjectEditorTrigger extends React.Component {
  constructor(props) {
    super(props)

    this.buttonText = this.buttonText.bind(this)
    this.onClick = this.onClick.bind(this)
  }

  buttonText() {
    if (this.props.params.pid) {
      return 'Edit'
    } else {
      return 'Create new project'
    }
  }

  onClick(e) {
    e.stopPropagation()

    if (this.props.params.isInOldEvent) return

    this.props.params.edit(this.props.params.pid)
  }

  render() {
    if (this.props.params.pid === 'manuallyShared') return

    return this.props.params.isInOldEvent ? (
      <OverlayTrigger overlay={<Tooltip>This project is in an old event and can thus not be edited anymore.</Tooltip>}>
        <span className='d-inline-block'>
          <Button disabled={true} className='ms-2' size='sm' variant='outline-primary' onClick={this.onClick}>
            {this.buttonText()}
          </Button>
        </span>
      </OverlayTrigger>
    ) : (
      <Button className='ms-2' size='sm' variant='outline-primary' onClick={this.onClick}>
        {this.buttonText()}
      </Button>
    )
  }
}

class Projects extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      editor: null,
    }

    this.edit = this.edit.bind(this)
    this.duplicateProject = this.duplicateProject.bind(this)
    this.close = this.close.bind(this)
  }

  duplicateProject(project, isInActiveEvent) {
    const newProject = {
      ...project,
      pid: null,
      evids: [],
      name: isInActiveEvent ? `${project.name} (copy)` : project.name,
    }

    this.setState({
      editor: (
        <ProjectEditor
          onClose={this.close}
          params={{ project: newProject, enid: session.getEnid(), ...this.props.params }}
        />
      ),
    })
  }

  edit(pid) {
    this.setState({
      editor: (
        <ProjectEditor onClose={this.close} params={{ pid: pid, enid: session.getEnid(), ...this.props.params }} />
      ),
    })
  }

  close() {
    this.setState({
      editor: null,
    })
  }

  render() {
    switch (this.state.editor) {
      case null:
        return (
          <div>
            <Container className='mt-4'>
              <div className='mb-4'>
                <h1>Projects</h1>
              </div>
            </Container>
            <Container className='mb-2'>
              <ProjectEditorTrigger params={{ pid: null, edit: this.edit }} />
            </Container>
            <ProjectListing
              params={{ ...this.props.params, duplicateProject: this.duplicateProject, edit: this.edit }}
            />
          </div>
        )
      default:
        return <div>{this.state.editor}</div>
    }
  }
}

function ProjectsWithParams(props) {
  const params = useParams()

  return <Projects {...props} params={params} />
}

export default ProjectsWithParams
