import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { Container, Accordion, Button, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap'
import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'
import api, { downloadCV, tags } from '../../api'
import StudentPopup from '../../components/studentPopup/studentPopup'
import ProjectEditor from '../../components/projectEditor/projectEditor'

import './projects.scss'
import '../../components/projectListItem/projectListItem.scss'
import ProjectList from '../../components/projectListRep/projectList'

import { degreeTagById, degreeById } from '../../definitions'

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`

function approvalBadge(project) {
  if (!project) {
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

const projectButtons = (project, edit) => {
  return (
    <>
      <OverlayTrigger overlay={<Tooltip>Duplicate this project for the current ThesisFair event</Tooltip>}>
        <Button
          size='sm'
          variant='outline-primary'
          className='ms-2 cv-button'
          onClick={e => {
            e.stopPropagation()
          }}
        >
          Duplicate
        </Button>
      </OverlayTrigger>
      <ProjectEditorTrigger params={{ ...project, edit: edit }} />
      <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
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
      </OverlayTrigger>
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
      eventProjects: {}, // Map from EVID to list of PIDs
      popup: false,
    }
  }

  async componentDidMount() {
    // Optimisation: Store student only once in state
    var projects = await api.project.getOfEntity(null, api.getApiTokenData().enid).exec()
    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

    // Get the votes of this entity as a list of [pid, uid] pairs
    var votes = await api.votes.getOfEntity(api.getApiTokenData().enid, null).exec()
    // Reduce the uids into lists, indexed by these pids ({pid: [uid, uid, ...], ...})
    votes = votes.reduce((c, vote) => ({ ...c, [vote.pid]: [...(c[vote.pid] || []), vote.uid] }), {})
    // Call 'getMultiple(uids)' for user info on these lists
    for (const [pid, uids] of Object.entries(votes)) {
      votes[pid] = await api.user.getMultiple(uids).exec()
    }

    var events = await api.event.getOfEntity(api.getApiTokenData().enid).exec()
    events = Object.fromEntries(events.map(event => [event.evid, event]))

    var eventProjects = Object.keys(events).map(evid => [
      evid,
      Object.keys(projects).filter(pid => projects[pid].evids.includes(evid)),
    ])
    eventProjects = Object.fromEntries(eventProjects)

    projects['manuallyShared'] = {
      pid: 'manuallyShared',
      name: 'Students that shared their data but did not vote for a project',
      description:
        'Thesis students explicitly shared their data with your company but have not voted for any of your projects.',
    }
    votes['manuallyShared'] = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec()

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
            const tags = project.tags.map(tag => (typeof tag === 'string' ? { tag, tooltip: undefined } : tag))

            project.degrees.forEach(id => tags.push(degreeById[id]))

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
                headerBadge={approvalBadge(project)}
                headerButtons={projectButtons(project, this.props.params.edit)}
              />
            )
          })}
        </ProjectList>
        <Accordion>
          {[].map(project => (
            <Accordion.Item key={project.pid} eventKey={project.pid}>
              <Accordion.Header>
                <div className='d-flex justify-content-between align-items-center w-100 me-3'>
                  <span className='me-3'>{project.name}</span>
                  {approvalBadge(project)}
                  <span className='me-auto' />
                  <ProjectEditorTrigger params={{ ...project, edit: this.props.params.edit }} />
                  <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
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
                  </OverlayTrigger>
                </div>
              </Accordion.Header>
              <Accordion.Body data-color-mode='light'>
                <MDEditor.Markdown
                  source={project.description}
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                />

                <h4 className='mt-4'>Students</h4>
                <div>
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
                  <h6>
                    <em>No students have voted for this project.</em>
                  </h6>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </>
    )
  }

  render() {
    return (
      <>
        <Container>
          {this.state.projects.length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          {Object.entries(this.state.eventProjects).map(([evid, pids]) => {
            const projects = pids.map(pid => this.state.projects[pid])
            const event = this.state.events[evid]

            return (
              <>
                <br />
                <span className='d-flex justify-content-between'>
                  <h3 style={{ alignSelf: 'flex-end' }}>{event.name}</h3>
                  <time style={{ alignSelf: 'flex-end' }} dateTime={event.start}>
                    {new Date(event.start).toLocaleDateString()}
                  </time>
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
    this.props.params.edit(this.props.params.pid)
  }

  render() {
    if (this.props.params.pid !== 'manuallyShared') {
      return (
        <Button className='ms-2' size='sm' variant='outline-primary' onClick={this.onClick}>
          {this.buttonText()}
        </Button>
      )
    }
  }
}

class Projects extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      editor: null,
    }

    this.edit = this.edit.bind(this)
    this.close = this.close.bind(this)
  }

  edit(pid) {
    this.setState({
      editor: <ProjectEditor onClose={this.close} params={{ pid: pid, ...this.props.params }} />,
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
            <ProjectListing params={{ ...this.props.params, edit: this.edit }} />
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
