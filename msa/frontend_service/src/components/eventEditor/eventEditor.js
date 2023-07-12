import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import { OverlayTrigger, Tooltip, Container, Button, Form, Row, Col, ButtonGroup } from 'react-bootstrap'

import api from '../../api'

import './style.scss'
import Tag from '../tag/tag'

import { degrees } from '../../definitions'

import cl from 'clsx'

// Expects evid in props
class EventEditor extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      evid: null,
      enabled: false,
      name: '',
      description: '',
      start: new Date(),
      end: new Date(),
      degrees: [],
      location: 'Somewhere over the rainbow',
      // studentSubmitDeadline: new Date(),
      // entities: [],

      hasBeenInteractedWith: {
        name: false,
        description: false,
        start: false,
        end: false,
        degrees: false,
        location: false,
        studentSubmitDeadline: false,
      },
    }

    this.submit = this.submit.bind(this)
    this.cancel = this.cancel.bind(this)
    this.deleteEvent = this.deleteEvent.bind(this)
    this.handleMasterCheck = this.handleMasterCheck.bind(this)
  }

  async componentDidMount() {
    if (this.props.params.evid) {
      const event = await api.event.get(this.props.params.evid).exec()
      event.start = new Date(event.start)
      event.end = new Date(event.end)
      this.setState(event)
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
      await this.updateEvent()
      this.props.onClose()
    } catch (e) {
      console.error(e)
    }
  }

  async updateEvent() {
    const event = {
      name: this.state.name,
      description: this.state.description,
      degrees: this.state.degrees,
      start: this.state.start,
      end: this.state.end,
      location: this.state.location,
      enabled: this.state.enabled,
    }

    // TODO: handle errors and show to user
    if (this.props.params.evid) {
      await api.event.update({ ...event, evid: this.props.params.evid }).exec()
    } else {
      await api.event.create(event).exec()
    }
  }

  async deleteEvent(e) {
    e.preventDefault()
    await api.event.delete(this.props.params.evid).exec()
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

  validate = () => Object.values(this.validation).every(f => f() === true)

  validation = {
    name: () => this.state.name.length > 0,
    description: () => this.state.description.length > 0,
    degrees: () => this.state.degrees.length > 0,
    expectations: () => true,
    start: () => true,
    end: () => true,
  }

  getDataInputs = () => (
    <Container className='mt-2 create-event' data-color-mode='light'>
      <h1 className='mb-4'>{this.props.params.evid ? 'Edit' : 'Create'} Event</h1>
      <Form>
        <Row className='mb-3'>
          <Form.Group as={Col} controlId='name'>
            <Form.Label>Event Name</Form.Label>
            <Form.Control
              name='name'
              type='text'
              placeholder='Enter a title for the event'
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
            <Form.Control.Feedback type='invalid'>Please enter a title for the event</Form.Control.Feedback>
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
          <Form.Group as={Col} className='mb-3' controlId='start'>
            <Form.Label>Starts at</Form.Label>
            <Form.Control
              name='startDate'
              type='date'
              value={this.state.start.toISOString().split('T')[0]}
              onChange={e => {
                const [year, month, date] = e.target.value.split('-')
                const newDate = this.state.start
                newDate.setUTCFullYear(year)
                newDate.setUTCMonth(month)
                newDate.setUTCDate(date)
                this.setState({
                  start: newDate,
                })
              }}
              onBlur={() => {
                this.setState({
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    start: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.start && !this.validation.start()}
              required
            />
            <Form.Control
              name='startTime'
              type='time'
              value={this.state.start.toISOString().split('T')[1].split('.')[0]}
              onChange={e => {
                const [hours, minutes] = e.target.value.split(':')
                const newTime = this.state.start
                newTime.setUTCHours(hours)
                newTime.setUTCMinutes(minutes)
                this.setState({
                  start: newTime,
                })
              }}
              onBlur={() => {
                this.setState({
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    start: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.start && !this.validation.start()}
              required
            />
            <Form.Control.Feedback type='invalid'>Bruh just git gud</Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} className='mb-3' controlId='end'>
            <Form.Label>ends at</Form.Label>
            <Form.Control
              name='endDate'
              type='date'
              value={this.state.end.toISOString().split('T')[0]}
              onChange={e => {
                const [year, month, date] = e.target.value.split('-')
                const newDate = this.state.end
                newDate.setUTCFullYear(year)
                newDate.setUTCMonth(month)
                newDate.setUTCDate(date)
                this.setState({
                  end: newDate,
                })
              }}
              onBlur={() => {
                this.setState({
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    end: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.end && !this.validation.end()}
              required
            />
            <Form.Control
              name='endTime'
              type='time'
              value={this.state.end.toISOString().split('T')[1].split('.')[0]}
              onChange={e => {
                const [hours, minutes] = e.target.value.split(':')
                const newTime = this.state.end
                newTime.setUTCHours(hours)
                newTime.setUTCMinutes(minutes)
                this.setState({
                  end: newTime,
                })
              }}
              onBlur={() => {
                this.setState({
                  hasBeenInteractedWith: {
                    ...this.state.hasBeenInteractedWith,
                    end: true,
                  },
                })
              }}
              isInvalid={this.state.hasBeenInteractedWith.end && !this.validation.end()}
              required
            />
            <Form.Control.Feedback type='invalid'>Bruh just git gud</Form.Control.Feedback>
          </Form.Group>
        </Row>

        <Form.Group className='mb-3 description' controlId='description'>
          <Form.Label>Event description (Markdown)</Form.Label>
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
            <Form.Group className='mb-3' controlId='location'>
              <Form.Label>Location</Form.Label>
              <Form.Control
                name='location'
                type='text'
                placeholder='Where will this even take place?'
                value={this.state.location}
                onChange={e => {
                  this.setState({
                    location: e.target.value,
                    hasBeenInteractedWith: {
                      ...this.state.hasBeenInteractedWith,
                      location: true,
                    },
                  })
                }}
                isInvalid={this.state.hasBeenInteractedWith.name && !this.validation.location()}
                required
              />
              <Form.Control.Feedback type='invalid'>Please enter a location for the event</Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col>
            <Form.Group className='mb-3' controlId='active'>
              <Form.Label>Active</Form.Label>
              <Form.Check
                type='switch'
                id='event-enable-switch'
                label={this.state.enabled ? 'This event will be enabled' : 'This event will be disabled'}
                onClick={_e => this.setState({ enabled: !this.state.enabled })}
                value={this.state.enabled}
              />
            </Form.Group>
          </Col>
        </Row>

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

        {this.props.params.evid && (
          <Button variant='secondary' type='cancel' onClick={this.deleteEvent}>
            Delete event WARNING HAS UNFORESEEN CONSEQUENCES
          </Button>
        )}
      </Form>
    </Container>
  )

  getSubmitButton = disabled => (
    <Button disabled={disabled} className='button-disabled' variant='primary' type='submit' onClick={this.submit}>
      {this.props.params.evid ? 'Update' : 'Create'} Event
    </Button>
  )

  render = () => this.getDataInputs()
}

export default EventEditor
