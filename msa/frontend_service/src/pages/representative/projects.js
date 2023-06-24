import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import {
  Container,
  Accordion,
  Button,
  Badge,
  CloseButton,
  Card,
  OverlayTrigger,
  Tooltip,
  Form,
  Row,
  Col,
} from 'react-bootstrap'
import { Typeahead } from 'react-bootstrap-typeahead'
import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'
import api, { downloadCV, degrees } from '../../api'
import StudentPopup from '../../components/studentPopup/studentPopup'
import ProjectEditor from '../../components/projectEditor/projectEditor'

import './projects.scss'
import '../../components/projectListItem/projectListItem.scss'

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`

function approvalBadge(project) {
  if (!project) {
    return
  }

  switch (project.approval) {
    case 'approved':
      return <Badge variant='success'>Approved</Badge>
    case 'rejected':
      return <Badge variant='danger'>Rejected</Badge>
    case 'awaiting':
      return <Badge variant='warning'>Awaiting approval</Badge>
    default:
      return
  }
}

class ProjectListing extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      projects: [],
      votedFor: {},
      popup: false,
    }
  }

  async componentDidMount() {
    // Optimisation: Store student only once in state
    const projects = await api.project.getOfEntity(this.props.params.evid, api.getApiTokenData().enid).exec()
    this.setState({ projects })

    const votedFor = {}
    for (const project of projects) {
      const uids = await api.votes.getOfProject(project.pid, this.props.params.evid).exec()
      votedFor[project.pid] = await api.user.getMultiple(uids).exec()
    }

    projects.push({
      pid: 'manuallyShared',
      name: 'Students that shared their data but did not vote for a project',
      description:
        'Thesis students explicitly shared their data with your company but have not voted for any of your projects.',
    })
    votedFor['manuallyShared'] = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec()
    this.setState({ projects, votedFor })
  }

  renderStudentModal = () => {
    const { projectIndex, studentIndex } = this.state.popup
    const project = this.state.projects[projectIndex]
    const student = this.state.votedFor[project.pid][studentIndex]

    return <StudentPopup student={student} onHide={() => this.setState({ popup: false })} />
  }

  downloadAllCVs = async project => {
    for (const student of this.state.votedFor[project.pid]) {
      await downloadCV(student.uid, genCVName(student, project))
    }
  }

  render() {
    return (
      <>
        <Container className='mt-2'>
          <div className='mb-4'>
            <h1>Projects</h1>
          </div>

          {this.state.projects.length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          <Accordion>
            {this.state.projects.map((project, projectIndex) => (
              <Accordion.Item key={projectIndex} eventKey={projectIndex}>
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
                        className='ms-2'
                        onClick={e => {
                          e.stopPropagation()
                          this.downloadAllCVs(project)
                        }}
                      >
                        <img src={downloadIcon} alt='download' />
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
                    {this.state.votedFor[project.pid] ? (
                      this.state.votedFor[project.pid].length > 0 ? (
                        this.state.votedFor[project.pid].map((student, studentIndex) => {
                          const studentInfoPresent = student.firstname || student.lastname || student.studies.length > 0
                          return (
                            <Card
                              key={studentIndex}
                              className='mb-2 hoverable'
                              bg={studentInfoPresent ? 'white' : 'gray'}
                              onClick={
                                studentInfoPresent
                                  ? e => this.setState({ popup: { projectIndex, studentIndex, cv: false } })
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
                                          onClick={e => {
                                            e.stopPropagation()
                                            downloadCV(student.uid, genCVName(student, project))
                                          }}
                                        >
                                          <img src={downloadIcon} alt='download' />
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
                    ) : null}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
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
        <Button size='sm' variant='outline-primary' onClick={this.onClick}>
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
            <ProjectListing params={{ ...this.props.params, edit: this.edit }} />
            <Container className='mt-2 project-list'>
              <ProjectEditorTrigger params={{ pid: null, edit: this.edit }} />
            </Container>
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
