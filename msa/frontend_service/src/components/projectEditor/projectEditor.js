import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import {
  OverlayTrigger,
  Tooltip,
  Container,
  Tab,
  Button,
  Form,
  Row,
  Col,
  Nav,
  ButtonGroup,
  ToggleButton,
} from 'react-bootstrap'

import api, { tags as allTags } from '../../api'

import './style.scss'
import Tag from '../tag/tag'

import { degrees } from '../../definitions'

import cl from 'clsx'

// Expects params.pid and params.enid as props
class ProjectEditor extends React.Component {
  // TODO: have a controlled input rather than uncontrolled (i.e. update state
  // as form is edited) for name
  constructor(props) {
    super(props)

    this.state = {
      name: '',
      description: '',
      environment: '',
      expectations: '',
      evids: [],
      degrees: [],
      tags: [],
      email: '',
      numberOfStudents: '',
      hasBeenInteractedWith: {
        name: false,
        description: false,
        environment: false,
        expectations: false,
        attendance: false,
        degrees: false,
        tags: false,
        email: false,
        numberOfStudents: false,
      },
      attendanceInteractions: [],
      showAttendance: false,
      activeEvents: [],
    }

    this.submit = this.submit.bind(this)
    this.cancel = this.cancel.bind(this)
    this.deleteProject = this.deleteProject.bind(this)
    this.removeTag = this.removeTag.bind(this)
    this.handleTagCheck = this.handleTagCheck.bind(this)
    this.handleMasterCheck = this.handleMasterCheck.bind(this)
    this.handleAttendanceChange = this.handleAttendanceChange.bind(this)
  }

  async componentDidMount() {
    // TODO: add environment, attendance and expectations to database
    if (this.props.params.pid) {
      const project = await api.project.get(this.props.params.pid).exec()
      this.setState(project)
    }

    if (this.props.params.project) {
      this.setState(this.props.params.project)
    }

    const activeEvents = await api.event.getActive().exec()
    const events = await api.event.getAll().exec()
    console.log(activeEvents, events)
    this.setState({ activeEvents })
  }

  async submit(e) {
    // Make sure the page does not reload
    e.preventDefault()

    if (!this.validate()) {
      e.stopPropagation()
      return
    }

    if (!this.attendanceIsValid()) {
      e.stopPropagation()
      return
    }

    try {
      await this.updateProject()
      this.props.onClose()
    } catch (e) {
      console.error(e)
    }
  }

  async continueToAttendance(e) {
    // Make sure the page does not reload
    e.preventDefault()

    if (!this.validate()) {
      e.stopPropagation()
      console.log(
        'invalid',
        this.validation.map(f => f())
      )
      return
    }

    this.setState({ showAttendance: true })

    console.log(this.state)
  }

  async updateProject() {
    const project = {
      enid: this.props.params.enid,
      name: this.state.name,
      description: this.state.description,
      degrees: this.state.degrees,
      tags: this.state.tags,
      attendance: this.state.evids.length > 0 ? 'yes' : 'no',
      evids: this.state.evids,
      environment: this.state.environment,
      email: this.state.email,
    }

    if (this.state.numberOfStudents) project.numberOfStudents = Number(this.state.numberOfStudents)
    if (this.state.expectations) project.expectations = this.state.expectations

    // TODO: handle errors and show to user
    if (this.props.params.pid) {
      await api.project.update({ ...project, pid: this.props.params.pid }).exec()
    } else {
      await api.project.create(project).exec()
    }
  }

  async deleteProject(e) {
    e.preventDefault()
    await api.project.delete(this.props.params.pid).exec()
    this.props.onClose()
  }

  cancel(e) {
    e.preventDefault()
    this.props.onClose()
  }

  evidIsAIEvent(evid) {
    return this.state.activeEvents.find(event => event.evid === evid).degrees.includes('MScAI')
  }

  handleMasterCheck(degree) {
    this.setState({
      hasBeenInteractedWith: {
        ...this.state.hasBeenInteractedWith,
        degrees: true,
      },
    })

    if (!this.state.degrees.includes(degree)) {
      this.setState({
        degrees: [...this.state.degrees, degree],
      })
    } else {
      this.setState({
        degrees: this.state.degrees.filter(item => item !== degree),
      })
    }

    // Reset attendance if the degree is changed
    if (degree === 'MScAI') {
      this.setState({
        evids: this.state.evids.filter(evid => !this.evidIsAIEvent(evid)),
        attendanceInteractions: this.state.attendanceInteractions.filter(evid => !this.evidIsAIEvent(evid)),
      })
    } else {
      this.setState({
        evids: this.state.evids.filter(evid => this.evidIsAIEvent(evid)),
        attendanceInteractions: this.state.attendanceInteractions.filter(evid => this.evidIsAIEvent(evid)),
      })
    }
  }

  handleTagCheck(tag) {
    this.setState({
      hasBeenInteractedWith: {
        ...this.state.hasBeenInteractedWith,
        tags: true,
      },
    })

    if (!this.state.tags.includes(tag)) {
      if (this.state.tags.length >= 3) return

      this.setState({
        tags: [...this.state.tags, tag],
      })
    } else {
      this.removeTag(tag)
    }
  }

  removeTag(tag) {
    this.setState({
      tags: this.state.tags.filter(item => item !== tag),
      hasBeenInteractedWith: {
        ...this.state.hasBeenInteractedWith,
        tags: true,
      },
    })
  }

  handleAttendanceChange(e) {
    this.setState({
      hasBeenInteractedWith: {
        ...this.state.hasBeenInteractedWith,
        attendance: true,
      },
    })

    if (e.currentTarget.value === this.state.attendance) {
      this.setState({ attendance: null })
    } else {
      this.setState({ attendance: e.currentTarget.value })
    }
  }

  attendanceIsValid = () => {
    const interactionCount = this.state.attendanceInteractions.length
    const applicableEvents = this.state.activeEvents.filter(event => this.isValidEvent(event)).length

    return interactionCount === applicableEvents
  }

  validate = () => Object.values(this.validation).every(f => f() === true)

  validateEmail = email => {
    const isEmailRegularExpression =
      /(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})/i

    // Use .match to find a valid email in the string
    return isEmailRegularExpression.exec(email) !== null
  }

  validation = {
    name: () => this.state.name.length > 0,
    description: () => this.state.description.length > 0,
    environment: () => this.state.environment.length > 0,
    degrees: () => this.state.degrees.length > 0,
    tags: () => this.state.tags.length >= 1 && this.state.tags.length <= 3,
    expectations: () => true,
    email: () => this.validateEmail(this.state.email),
    numberOfStudents: () => {
      const numberOfStudents = Number(this.state.numberOfStudents)
      return this.state.numberOfStudents === '' || (numberOfStudents > 0 && Number.isInteger(numberOfStudents))
    },
  }

  getDataInputs = () => (
    <Container className='mt-2 create-project' data-color-mode='light'>
      <h1 className='mb-4'>{this.props.params.pid ? 'Edit' : 'Create'} Project</h1>
      <Form>
        <Row className='mb-3'>
          <Form.Group as={Col} controlId='name'>
            <Form.Label>Project Name</Form.Label>
            <Form.Control
              name='name'
              type='text'
              placeholder='Enter a concise title for your project'
              value={this.state.name}
              onChange={e => {
                this.setState({
                  name: e.target.value,
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    name: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.name && !this.validation.name()}
              required
            />
            <Form.Control.Feedback type='invalid'>Please enter a title for your project</Form.Control.Feedback>
          </Form.Group>

          <Col xs='auto'>
            <Form.Group controlId='degrees'>
              <Form.Label>Applicable masters</Form.Label>
              <br />
              <ButtonGroup
                className={cl('degree-tags', {
                  'is-invalid': this.state.hasBeenInteractedWith.degrees && !this.validation.degrees(),
                })}
              >
                {Object.values(degrees).map(({ id, tag, tooltip }) => (
                  <Form.Check className='form-tag' inline title={tag} key={tag}>
                    <Form.Check.Input
                      name={tag}
                      key={tag}
                      className='form-tag__checkbox'
                      checked={this.state.degrees.includes(id)}
                      onChange={() => {}}
                    />
                    <Form.Check.Label>
                      <OverlayTrigger overlay={<Tooltip>{tooltip}</Tooltip>}>
                        <span>
                          <Tag
                            label={tag}
                            id={id}
                            selectable={true}
                            selected={this.state.degrees.includes(id)}
                            onClick={this.handleMasterCheck}
                          />
                        </span>
                      </OverlayTrigger>
                    </Form.Check.Label>
                  </Form.Check>
                ))}
              </ButtonGroup>
              <Form.Control.Feedback type='invalid'>Please specify at least one degree</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Row className='mb-3'>
          <Form.Group as={Col} className='mb-3' controlId='email'>
            <Form.Label>Email address</Form.Label>
            <Form.Control
              name='email'
              type='email'
              placeholder='Enter the email for contact about your project'
              value={this.state.email}
              onChange={e => {
                this.setState({
                  email: e.target.value,
                })
              }}
              onBlur={() => {
                this.setState({
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    email: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.email && !this.validation.email()}
              required
            />
            <Form.Control.Feedback type='invalid'>Please enter a valid email</Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} className='mb-3' controlId='numberOfStudents'>
            <Form.Label>Number of students</Form.Label>
            <Form.Control
              name='numberOfStudents'
              type='text'
              placeholder='Enter the amount of students you are looking for (optional)'
              value={this.state.numberOfStudents}
              min='0'
              onChange={e => {
                if (e.target.value === '0') {
                  e.target.value = ''
                }

                this.setState({
                  numberOfStudents: e.target.value,
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    numberOfStudents: true,
                  },
                })
              }}
              isInvalid={
                this.state.numberOfStudents !== null &&
                this.state.hasBeenInteractedWith.numberOfStudents &&
                !this.validation.numberOfStudents()
              }
            />
            <Form.Control.Feedback type='invalid'>Please enter a natural number</Form.Control.Feedback>
          </Form.Group>
        </Row>

        <Form.Group className='mb-3 description' controlId='description'>
          <Form.Label>Project description</Form.Label>
          <MDEditor
            value={this.state.description}
            onChange={value => {
              this.setState({
                description: value,
                hasBeenInteractedWith: { ...this.state.hasBeenInteractedWith, description: true },
              })
            }}
            height={500}
            className={cl({
              'is-invalid': this.state.hasBeenInteractedWith.description && !this.validation.description(),
            })}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />
          <Form.Control.Feedback type='invalid'>Please write up a description</Form.Control.Feedback>
        </Form.Group>

        <Row>
          <Col>
            <Form.Group className='mb-3 environment' controlId='environment'>
              <Form.Label>Work environment</Form.Label>
              <MDEditor
                value={this.state.environment}
                onChange={value => {
                  this.setState({
                    environment: value,
                    hasBeenInteractedWith: {
                      ...this.state.hasBeenInteractedWith,
                      environment: true,
                    },
                  })
                }}
                height={200}
                className={cl({
                  'is-invalid': this.state.hasBeenInteractedWith.environment && !this.validation.environment(),
                })}
                preview='edit'
                previewOptions={{
                  rehypePlugins: [[rehypeSanitize]],
                }}
              />
              <Form.Control.Feedback type='invalid'>Please descibe your working environment</Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col>
            <Form.Group className='mb-3 expectations' controlId='expectations'>
              <Form.Label>Expectations</Form.Label>
              <MDEditor
                value={this.state.expectations}
                onChange={value => {
                  this.setState({
                    expectations: value,
                    hasBeenInteractedWith: {
                      ...this.state.hasBeenInteractedWith,
                      expectations: true,
                    },
                  })
                }}
                height={200}
                className={cl({
                  'is-invalid': this.state.hasBeenInteractedWith.expectations && !this.validation.expectations(),
                })}
                preview='edit'
                previewOptions={{
                  rehypePlugins: [[rehypeSanitize]],
                }}
              />
              <Form.Control.Feedback type='invalid'>Please note your expectations of the student</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className='mb-3 tags' controlId='tags'>
          <Form.Label
            className={cl({ 'is-invalid': this.state.hasBeenInteractedWith.tags && !this.validation.tags() })}
          >
            Research Tags (Select 1 to 3)
          </Form.Label>
          <Row>
            <Tab.Container id='left-tabs-example' defaultActiveKey={Object.keys(allTags)[0]}>
              <Col xs='3'>
                <Form.Label>Category</Form.Label>
                <Nav variant='pills' className='tag-category'>
                  {Object.keys(allTags).map(category => (
                    <Nav.Item key={category} className='tag-category__item'>
                      <Nav.Link eventKey={category}>{category}</Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              </Col>
              <Col>
                <Form.Label>Tags</Form.Label>
                <Tab.Content>
                  {Object.entries(allTags).map(([category, tags]) => (
                    <Tab.Pane eventKey={category} key={category} className='selectable-tags'>
                      {tags.map(tag => (
                        <Form.Check className='form-tag selectable-tag' inline key={`${category}.${tag}`}>
                          <Form.Check.Input
                            name={`${category}.${tag}`}
                            key={`${category}.${tag}`}
                            className='form-tag__checkbox'
                            checked={this.state.tags.includes(`${category}.${tag}`)}
                            onChange={() => {}}
                          />
                          <Form.Check.Label>
                            <Tag
                              label={tag}
                              id={`${category}.${tag}`}
                              selectable={true}
                              selected={this.state.tags.includes(`${category}.${tag}`)}
                              disabled={this.state.tags.length >= 3 && !this.state.tags.includes(`${category}.${tag}`)}
                              onClick={this.handleTagCheck}
                            />
                          </Form.Check.Label>
                        </Form.Check>
                      ))}
                    </Tab.Pane>
                  ))}
                </Tab.Content>
              </Col>
            </Tab.Container>
            <Col>
              <Form.Label>Currently selected</Form.Label>
              <div className='selected-tags'>
                {this.state.tags.map(tag => (
                  <Tag
                    label={tag.split('.')[1]}
                    id={tag}
                    key={tag}
                    selectable={true}
                    selected={true}
                    onClick={() => this.removeTag(tag)}
                  />
                ))}
              </div>
            </Col>
          </Row>

          <br />
          <Form.Control.Feedback type='invalid'>Please select 1-3 tags</Form.Control.Feedback>
        </Form.Group>

        <Button
          variant='primary'
          type='submit'
          onClick={e => {
            // Set all hasBeenInteractedWith to true
            this.setState({
              hasBeenInteractedWith: {
                name: true,
                description: true,
                environment: true,
                expectations: true,
                attendance: true,
                degrees: true,
                tags: true,
                email: true,
                numberOfStudents: true,
              },
            })

            this.continueToAttendance(e)
          }}
        >
          Continue to attendance
        </Button>

        <Button variant='secondary' type='cancel' onClick={this.cancel}>
          Cancel
        </Button>

        {this.props.params.pid && (
          <Button variant='secondary' type='cancel' onClick={this.deleteProject}>
            Delete project
          </Button>
        )}
      </Form>
    </Container>
  )

  isValidEvent = event => {
    const isAIEvent = event.degrees !== null && event.degrees.includes('MScAI')
    const hasNonAIDegree = this.state.degrees.some(degree => degree !== 'MScAI')

    if (isAIEvent) return this.state.degrees.includes('MScAI')
    return hasNonAIDegree
  }

  getEventCard = (event, isValid) => (
    <div key={event.evid} className={cl('attendance__event', { 'attendance__event--disabled': !isValid })}>
      <div className='attendance__event-card'>
        <div className='attendance__fading'>
          <p className='attendance__event-name'>{event.name}</p>

          <Tag
            className='attendance__event-tag'
            label={event.degrees !== null && event.degrees.includes('MScAI') ? 'AI Thesis Fair' : 'General Thesis Fair'}
          ></Tag>

          <MDEditor.Markdown
            source={event.description}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />
        </div>
      </div>

      <ButtonGroup
        key={event.evid}
        id={`attendance-${event.evid}`}
        type='radio'
        name='attendance'
        value={event.evid}
        className='attendance__buttons'
        checked={this.state.evids.includes(event.evid)}
        onChange={this.handleAttendanceChange}
      >
        <ToggleButton
          id={`yes-attendance-${event.evid}`}
          type='radio'
          name='attendance'
          value={'yes'}
          className={cl('attendance__button', {
            'attendance__button--selected':
              this.state.evids.includes(event.evid) && this.state.attendanceInteractions.includes(event.evid),
          })}
          checked={this.state.evids.includes(event.evid) && this.state.attendanceInteractions.includes(event.evid)}
          onClick={() => {
            const evids = [...new Set([...this.state.evids, event.evid])]
            const attendanceInteractions = [...new Set([...this.state.attendanceInteractions, event.evid])]

            console.log(evids, attendanceInteractions)

            this.setState({ evids, attendanceInteractions })
          }}
        >
          Attending
        </ToggleButton>

        <ToggleButton
          id={`no-attendance-${event.evid}`}
          type='radio'
          name='attendance'
          value={'no'}
          className={cl('attendance__button', {
            'attendance__button--selected':
              !isValid ||
              (!this.state.evids.includes(event.evid) && this.state.attendanceInteractions.includes(event.evid)),
          })}
          checked={
            !isValid ||
            (!this.state.evids.includes(event.evid) && this.state.attendanceInteractions.includes(event.evid))
          }
          onClick={() => {
            const evids = this.state.evids.filter(item => item !== event.evid)
            const attendanceInteractions = [...new Set([...this.state.attendanceInteractions, event.evid])]

            console.log(evids, attendanceInteractions)

            this.setState({ evids, attendanceInteractions })
          }}
        >
          Not attending
        </ToggleButton>
      </ButtonGroup>
    </div>
  )

  getSubmitButton = disabled => (
    <Button disabled={disabled} className='button-disabled' variant='primary' type='submit' onClick={this.submit}>
      {this.props.params.pid ? 'Update' : 'Create'} Project
    </Button>
  )

  getAttendanceInputs = () => (
    <Container className='mt-2 attendance' data-color-mode='light'>
      <h1 className='mb-4 mt-3'>This project is for:</h1>

      <p className='mb-3'>
        This project will always be on the marketplace. Please select which (if any) Thesis Fairs is this for?
      </p>

      <Form>
        <div className='attendance__events'>
          {this.state.activeEvents.length === 0 && <p>No events are currently active</p>}
          {this.state.activeEvents.map(event =>
            this.isValidEvent(event) ? (
              this.getEventCard(event, true)
            ) : (
              <OverlayTrigger
                overlay={
                  <Tooltip>
                    {event.degrees !== null && event.degrees.includes('MScAI') ? (
                      <p style={{ margin: 0 }}>
                        Not applicable to your project: select the AI Master to attend this event
                      </p>
                    ) : (
                      <p style={{ margin: 0 }}>
                        Not applicable to your project: select a non-AI Master to attend this event
                      </p>
                    )}
                  </Tooltip>
                }
              >
                <span>{this.getEventCard(event, false)}</span>
              </OverlayTrigger>
            )
          )}
        </div>

        {this.attendanceIsValid() ? (
          this.getSubmitButton(false)
        ) : (
          <OverlayTrigger overlay={<Tooltip>Select attendance for all events before submitting</Tooltip>}>
            <span style={{ display: 'inline-block' }}>{this.getSubmitButton(true)}</span>
          </OverlayTrigger>
        )}

        <Button
          variant='secondary'
          type='cancel'
          onClick={() => this.setState({ showAttendance: false })}
          style={{ cursor: 'pointer' }}
        >
          Return to project details
        </Button>
      </Form>
    </Container>
  )

  render = () => (!this.state.showAttendance ? this.getDataInputs() : this.getAttendanceInputs())
}

export default ProjectEditor
