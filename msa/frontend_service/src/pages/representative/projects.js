import React from 'react'
import { Button, Container, OverlayTrigger, Tooltip } from 'react-bootstrap'
// import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'

import api, { downloadCV } from '../../api'
import ProjectEditor from '../../components/projectEditor/projectEditor'
import ProjectList from '../../components/projectListRep/projectList'
import StudentPopup from '../../components/studentPopup/studentPopup'
import Tag from '../../components/tag/tag'
import * as session from '../../session'
import { degreeById } from '../../utilities/degreeDefinitions'
import { findFairs } from '../../utilities/fairs'

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
      events: {}, // Map from EVID to event info
      allEventsByEvid: {}, // Map from EVID to event info
      eventProjects: {}, // Map (actual map object) from list of EVIDs to list of PIDs
      popup: false,
    }
  }

  approvalStatus = project => {
    if (!project) {
      return
    }

    if (!project.evids || project.evids.length === 0) {
      return
    }

    const projectEvents = project.evids.map(evid => this.state.allEventsByEvid?.[evid]).filter(event => event)
    const fairs = findFairs(projectEvents)

    if (fairs.length === 0) {
      return
    }

    switch (project.approval) {
      case 'rejected':
        return <Tag className='tag--approval-rejected' label='Rejected' />
      case 'commented':
        return <Tag className='tag--approval-changes' label='Changes requested' />
      case 'awaiting':
        return <Tag className='tag--approval-awaiting' label='Awaiting approval' />
      case 'payment':
        return <Tag className='tag--approval-payment' label='Awaiting payment' />
      case 'approved':
      case 'preliminary':
        return <Tag className='tag--approval-approved' label='Approved' />
      default:
        return
    }
  }

  async componentDidMount() {
    // Optimisation: Store student only once in state
    let projects = await api.project.getOfEntity(null, session.getEnid()).exec()
    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

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

    const currentEvents = await api.event.getActive().exec()
    const allEventsByEvid = Object.fromEntries(currentEvents.map(event => [event.evid, event]))

    this.setState({ allEventsByEvid })

    // Find info for every event
    const events = {}
    // TODO: remove this loop with api calls
    for (const evid of [...new Set(Array.from(eventProjects.keys()).map(JSON.parse).flat())]) {
      // If there is a null event (from (A) above), give it a fitting name
      events[evid] = evid ? await api.event.get(evid).exec() : { name: 'No event' }
    }

    this.setState({ projects, events, eventProjects })
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
                headerBadge={this.approvalStatus(project)}
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

            let events = JSON.parse(evids).map(evid => this.state.events[evid])

            const nonMarketplaceEvents = events.filter(event => !event.marketplace)

            if (nonMarketplaceEvents.length > 0) {
              events = nonMarketplaceEvents
            }

            return (
              <>
                <br />
                <span className='d-flex justify-content-between'>
                  <h3 style={{ alignSelf: 'flex-end' }}>{events.map(event => event.name).join(' & ')}</h3>

                  <time key={events[0].evid} style={{ alignSelf: 'flex-end' }} dateTime={events[0].start}>
                    {events[0].start ? new Date(events[0].start).toLocaleDateString() : ''}
                  </time>
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
            <Container className='mt-4 scrollable-page'>
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
