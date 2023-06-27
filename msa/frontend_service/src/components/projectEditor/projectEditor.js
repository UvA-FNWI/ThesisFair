import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import {
  Container,
  Tab,
  Button,
  Form,
  Row,
  Col,
  Nav,
  CloseButton,
  ToggleButton,
  ButtonGroup,
  FormControl,
} from 'react-bootstrap'
// import { Typeahead } from 'react-bootstrap-typeahead'
import api, { degrees, tags as allTags } from '../../api'

import './style.scss'
import Tag from '../tag/tag'

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
      attendance: null,
      degrees: [],
      tags: [],
    }

    this.submit = this.submit.bind(this)
    this.cancel = this.cancel.bind(this)
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

    // Get the `data-submit-type` attribute of the button that was clicked
    // (either `submit`, `cancel` or `delete`)
    const submitType = e.nativeEvent.submitter.getAttribute('data-submit-type')

    switch (submitType) {
      case 'submit':
        if (!this.validate()) {
          e.stopPropagation()
          return
        }

        await this.updateProject(e)
        break
      case 'cancel':
        this.cancel(e)
        break
      case 'delete':
        this.deleteProject(e)
        break
      default:
        throw new Error(`Unknown submit type: ${submitType}`)
    }

    return this.props.onClose()
  }

  async updateProject(e) {
    const project = {
      enid: api.getApiTokenData().enid,
      name: this.state.name,
      description: this.state.description,
      degrees: this.state.degrees,
      tags: this.state.tags,
      attendance: this.state.attendance,
      environment: this.state.environment,
      expectations: this.state.expectations,
    }

    // TODO: handle errors and show to user
    if (this.props.params.pid) {
      await api.project.update({ ...project, pid: this.props.params.pid }).exec()
    } else {
      await api.project.create({ ...project, evid: this.props.params.evid }).exec()
    }
  }

  async deleteProject(_e) {
    await api.project.delete(this.props.params.pid).exec()
  }

  cancel(e) {
    e.preventDefault()
    this.props.onClose()
  }

  handleMasterCheck(degree) {
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
    })
  }

  attendanceOptions = [
    { value: 'yes', name: 'Yes' },
    { value: 'no', name: 'No' },
  ]

  handleAttendanceChange(e) {
    if (e.currentTarget.value === this.state.attendance) {
      this.setState({ attendance: null })
    } else {
      this.setState({ attendance: e.currentTarget.value })
    }
  }

  validate = () => {
    console.log(this.validation)
    let bruh = Object.values(this.validation).every(f => f() === true)
    console.log(bruh)
    return bruh
  }

  validation = {
    name: () => this.state.name.length > 0,
    description: () => this.state.description.length > 0,
    environment: () => this.state.environment.length > 0,

    degrees: () => this.state.degrees.length > 0,
    attendance: () => this.attendanceOptions.map(({ value }) => value).includes(this.state.attendance),
    tags: () => this.state.tags.length > 0 && this.state.tags.length <= 3,

    expectations: () => true,
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
                onChange={e => this.setState({ name: e.target.value })}
                isInvalid={!this.validation.name()}
                required
              />
              <Form.Control.Feedback type='invalid'>Please enter a title for your project</Form.Control.Feedback>
            </Form.Group>

            <Col xs='auto'>
              <Form.Group controlId='degrees'>
                <Form.Label>Applicable masters</Form.Label>
                <br />
                <ButtonGroup className={'mt-2 ' + (this.validation.degrees() ? '' : 'is-invalid')}>
                  {Object.entries(degrees).map(([degree, fullname]) => (
                    <Form.Check className='list-item' inline title={fullname} key={degree}>
                      <Form.Check.Input
                        name={degree}
                        key={degree}
                        className='list-item__checkbox'
                        checked={this.state.degrees.includes(degree)}
                        onChange={() => {}}
                      />
                      <Form.Check.Label>
                        <Tag
                          label={degree}
                          id={degree}
                          selectable={true}
                          selected={this.state.degrees.includes(degree)}
                          onClick={this.handleMasterCheck}
                        />
                      </Form.Check.Label>
                    </Form.Check>
                  ))}
                </ButtonGroup>
                <Form.Control.Feedback type='invalid'>Please specify at least one degree</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col xs='auto'>
              <Form.Group controlId='attendance'>
                <Form.Label>Attending</Form.Label>
                <br />
                <ButtonGroup className={this.validation.attendance() || 'is-invalid'}>
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
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className='mb-3 environment' controlId='environment'>
                <Form.Label>Work environment</Form.Label>
                <MDEditor
                  value={this.state.environment}
                  onChange={value => this.setState({ environment: value })}
                  height={200}
                  preview='edit'
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                />
              </Form.Group>
            </Col>

            <Col>
              <Form.Group className='mb-3 expectations' controlId='expectations'>
                <Form.Label>Expectations</Form.Label>
                <MDEditor
                  value={this.state.expectations}
                  onChange={value => this.setState({ expectations: value })}
                  height={200}
                  preview='edit'
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className='mb-3 tags' controlId='tags'>
            <Form.Label>Tags</Form.Label>
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
                  <Form.Label>Tags (max 3)</Form.Label>
                  <Tab.Content>
                    {Object.entries(allTags).map(([category, tags]) => (
                      <Tab.Pane eventKey={category} key={category} className='selectable-tags'>
                        {tags.map(tag => (
                          <Form.Check className='list-item selectable-tag' inline key={`${category}.${tag}`}>
                            <Form.Check.Input
                              name={`${category}.${tag}`}
                              key={`${category}.${tag}`}
                              className='list-item__checkbox'
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
                      selectable={true}
                      selected={true}
                      className='selected-tag'
                      onClick={() => this.removeTag(tag)}
                    />
                  ))}
                </div>
              </Col>
            </Row>
          </Form.Group>

          <Button variant='primary' type='submit' data-submit-type='submit'>
            Submit
          </Button>

          <Button variant='secondary' type='cancel' data-submit-type='cancel' onClick={this.cancel}>
            Cancel
          </Button>

          {this.props.params.pid && (
            <Button variant='secondary' type='cancel' data-submit-type='delete'>
              Delete project
            </Button>
          )}
        </Form>
      </Container>
    )
  }
}

export default ProjectEditor
