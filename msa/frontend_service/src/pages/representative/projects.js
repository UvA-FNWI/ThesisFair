import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { Container, Accordion, Button, Card, OverlayTrigger, Tooltip, Form, Row, Col } from 'react-bootstrap'
import { Typeahead } from 'react-bootstrap-typeahead'
import downloadIcon from 'bootstrap-icons/icons/download.svg'
import { useParams } from 'react-router-dom'
import api, { downloadCV, degrees } from '../../api'
import StudentPopup from '../../components/studentPopup/studentPopup'

import './projects.scss'
import '../../components/projectListItem/projectListItem.scss'

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`

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

          <Accordion defaultActiveKey={0}>
            {this.state.projects.map((project, projectIndex) => (
              <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                <Accordion.Header>
                  <div className='d-flex justify-content-between align-items-center w-100 me-3'>
                    <span className='me-auto'>{project.name}</span>
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

class ProjectEditor extends React.Component {
  // TODO: have a controlled input rather than uncontrolled (i.e. update state
  // as form is edited) for name
  constructor(props) {
    super(props)

    this.state = {
      evid: this.props.params.evid,
      name: '',
      description: '',
      degrees: [],
      tags: [],
      allTags: [],
    }

    this.submit = this.submit.bind(this)
    this.handleMasterCheck = this.handleMasterCheck.bind(this)
    this.addTags = this.addTags.bind(this)
    this.removeTags = this.removeTags.bind(this)
  }

  async componentDidMount() {
    if (this.props.params.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      this.setState({
        name: project.name,
        description: project.description,
        degrees: project.degrees,
        tags: project.tags,
      })
    }

    const tags = await api.project.tags().exec()
    this.setState({
      allTags: tags,
    })
  }

  async submit(e) {
    // Make sure the page does not reload
    e.preventDefault()

    // Get the `data-submit-type` attribute of the button that was clicked
    // (either `submit`, `cancel` or `delete`)
    const submitType = e.nativeEvent.submitter.getAttribute('data-submit-type')

    switch (submitType) {
      case 'submit':
        return await this.updateProject(e)
      case 'cancel':
        return this.cancel(e)
      case 'delete':
        return this.deleteProject(e)
      default:
        throw new Error(`Unknown submit type: ${submitType}`)
    }
  }

  async updateProject(e) {
    const formData = Object.fromEntries(new FormData(e.target).entries())

    // TODO: handle errors and show to user
    if (this.props.params.pid) {
      await api.project
        .update({
          enid: api.getApiTokenData().enid,
          pid: this.props.params.pid,
          name: formData.name,
          description: this.state.description,
          degrees: this.state.degrees,
          tags: this.state.tags,
        })
        .exec()
    } else {
      await api.project
        .create({
          enid: api.getApiTokenData().enid,
          evid: this.props.params.evid,
          name: formData.name,
          description: this.state.description,
          degrees: this.state.degrees,
          tags: this.state.tags,
        })
        .exec()
    }

    this.props.params.close()
  }

  async deleteProject(_e) {
    await api.project.delete(this.props.params.pid).exec()
    this.props.params.close()
  }

  cancel(e) {
    e.preventDefault()
    this.props.params.close()
  }

  handleMasterCheck(e) {
    const degree = e.target.attributes.name.value

    if (e.target.checked) {
        this.setState({
          degrees: [...this.state.degrees, degree]
        })
    } else {
        this.setState({
          degrees: this.state.degrees.filter(item => item !== degree)
        })
    }
  }

  addTags(tags) {
    tags = tags.map(val => val.label ? val.label : val)

    this.setState({
      tags: [...new Set([...this.state.tags, ...tags])],
      allTags: [...new Set([...this.state.allTags, ...tags])],
    })
  }

  removeTags(tags) {
    this.setState({
      tags: this.state.tags.filter(tag => !tags.includes(tag)),
    })
  }

  render() {
    // TODO: master tags should be greyed out when clicked, no checkboxes -
    // would save space and look nicer
    return (
      <Container className='mt-2 create-project'>
        <h1 className='mb-4'>{this.props.params.pid ? 'Edit' : 'Create'} Project</h1>
        <Form onSubmit={this.submit}>
          <Row className='mb-3'>
            <Col>
              <Form.Group as={Col} controlId='name'>
                <Form.Label>Project Name</Form.Label>
                <Form.Control
                  name='name'
                  type='text'
                  placeholder='Enter a concise title for your project'
                  defaultValue={this.state.name}
                />
              </Form.Group>
            </Col>

            <Col xs='auto'>
              <Form.Group as={Col} controlId='degrees'>
                <Form.Label>Applicable masters</Form.Label>
                <div className='mt-2 list-item__tags'>
                  {Object.entries(degrees).map(([degree, fullname]) => (
                    <Form.Check inline title={fullname} key={degree}>
                      <Form.Check.Input name={degree} key={degree} checked={this.state.degrees.includes(degree)} onChange={this.handleMasterCheck}/>
                      <Form.Check.Label className='list-item__tag'>
                        <p>{degree}</p>
                      </Form.Check.Label>
                    </Form.Check>
                  ))}
                </div>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className='mb-3 description' controlId='description'>
            <Form.Label>Project description (Markdown)</Form.Label>
            <MDEditor
              value={this.state.description}
              onChange={value => this.setState({ description: value })}
              height={500}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />
            <Form.Control
              name='description'
              as='textarea'
              rows={8}
              placeholder="Your project's full description"
              defaultValue={this.state.description}
            />
          </Form.Group>
          
          <Form.Group className='mb-3 tags' controlId='tags'>
            <Form.Label>Tags</Form.Label>
            <Row>
              <Col xs='8'>
                <div className='mt-2 list-item__tags'>
                    {this.state.tags.map(tag => (
                      <div style={{'display': 'flex', 'align-items': 'center', 'margin-right': '0.5em'}}>
                        <div className='list-item__tag'><p>{tag}</p></div>
                        <Button variant='secondary' size='sm' onClick={() => this.removeTags(tag)}>x</Button>
                      </div>
                    ))}
                </div>
              </Col>
              <Col>
                <Typeahead
                  onChange={this.addTags}
                  options={this.state.allTags.filter(tag => !this.state.tags.includes(tag))}
                  placeholder='Add a tag'
                  allowNew
                  id='tags'
                />
              </Col>
            </Row>
          </Form.Group>

          <Button variant='primary' type='submit' data-submit-type='submit'>
            Submit
          </Button>

          <Button variant='secondary' type='cancel' data-submit-type='cancel'>
            Cancel
          </Button>
          
          {this.props.params.pid &&
            <Button variant='secondary' type='cancel' data-submit-type='delete'>
              Delete project
            </Button>
          }
        </Form>
      </Container>
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
      editor: <ProjectEditor params={{ pid: pid, ...this.props.params, close: this.close }} />,
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
