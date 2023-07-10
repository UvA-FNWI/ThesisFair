import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { OverlayTrigger, Tooltip, Container, Tab, Button, Form, Row, Col, Nav, ButtonGroup } from 'react-bootstrap'
// import { Typeahead } from 'react-bootstrap-typeahead'
import api, { tags as allTags } from '../../api'

import './style.scss'
import Tag from '../tag/tag'

import { degrees } from '../../definitions'

import cl from 'clsx'

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
      attendance: 'no',
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
      // this.setState({
      // name: project.name,
      // description: project.description,
      // // environment: project.environment,
      // attendance: project.attendance,
      // // expectations: project.expectations,
      // degrees: project.degrees,
      // tags: project.tags,
      // approval: project.approval,
      // })
    }
  }

  async submit(e) {
    // Make sure the page does not reload
    e.preventDefault()

    if (!this.validate()) {
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

  async updateProject() {
    const project = {
      enid: api.getApiTokenData().enid,
      name: this.state.name,
      description: this.state.description,
      degrees: this.state.degrees,
      tags: this.state.tags,
      attendance: this.state.attendance || 'no',
      environment: this.state.environment,
      email: this.state.email,
    }

    if (this.state.numberOfStudents) project.numberOfStudents = Number(this.state.numberOfStudents)
    if (this.state.expectations) project.expectations = this.state.expectations

    // Add the appropriate events to the project based on the selected degrees
    const events = await api.event.getActive().exec()
    console.log(events)
    project.evids = events
      .filter(e => project.degrees.some(degree => e.degrees && e.degrees.includes(degree)))
      .map(e => e.evid)

    console.log(project)

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

  attendanceOptions = [
    { value: 'yes', name: 'Yes' },
    { value: 'no', name: 'No' },
  ]

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

  validate = () => Object.values(this.validation).every(f => f() === true)

  validateEmail = email =>
    /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(
      email
    )

  validation = {
    name: () => this.state.name.length > 0,
    description: () => this.state.description.length > 0,
    environment: () => this.state.environment.length > 0,
    degrees: () => this.state.degrees.length > 0,
    // attendance: () => this.attendanceOptions.map(({ value }) => value).includes(this.state.attendance),
    tags: () => this.state.tags.length >= 1 && this.state.tags.length <= 3,
    expectations: () => true,
    email: () => this.validateEmail(this.state.email),
    numberOfStudents: () => {
      const numberOfStudents = Number(this.state.numberOfStudents)
      return this.state.numberOfStudents === '' || (numberOfStudents > 0 && Number.isInteger(numberOfStudents))
    },
  }

  render() {
    // TODO: master tags should be greyed out when clicked, no checkboxes -
    // would save space and look nicer
    return (
      <Container className='mt-2 create-project' data-color-mode='light'>
        <h1 className='mb-4'>{this.props.params.pid ? 'Edit' : 'Create'} Project</h1>
        <Form onSubmit={this.submit}>
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
            <Form.Label>Project description (Markdown)</Form.Label>
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
                <Form.Control.Feedback type='invalid'>
                  Please note your expectations of the student
                </Form.Control.Feedback>
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
                                disabled={
                                  this.state.tags.length >= 3 && !this.state.tags.includes(`${category}.${tag}`)
                                }
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

          {/* <Col xs='auto'>
            <Form.Group controlId='attendance'>
              <Form.Label>Attending</Form.Label>
              <br />
              <ButtonGroup
                className={cl({
                  'is-invalid': this.state.hasBeenInteractedWith.attendance && !this.validation.attendance(),
                })}
              >
                {this.attendanceOptions.map(({ value, name }) => (
                  <ToggleButton
                    key={value}
                    id={`attendance-${value}`}
                    type='radio'
                    name='attendance'
                    value={value}
                    className='button-attending'
                    checked={this.state.attendance === value}
                    onChange={this.handleAttendanceChange}
                  >
                    {name}
                  </ToggleButton>
                ))}
              </ButtonGroup>
              <Form.Control.Feedback type='invalid'>Specify</Form.Control.Feedback>
            </Form.Group>
          </Col> */}

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

              this.submit(e)
            }}
          >
            Submit
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
  }
}

export default ProjectEditor
