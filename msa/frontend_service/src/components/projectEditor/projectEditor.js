import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { Container, Accordion, Button, CloseButton, Form, Row, Col } from 'react-bootstrap'
import { Typeahead } from 'react-bootstrap-typeahead'
import api, { degrees } from '../../api'

import '../../components/projectListItem/projectListItem.scss'

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
        approval: project.approval,
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
  }

  async deleteProject(_e) {
    await api.project.delete(this.props.params.pid).exec()
  }

  cancel(e) {
    e.preventDefault()
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
                        <CloseButton onClick={() => this.removeTags(tag)}/>
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

export default ProjectEditor
