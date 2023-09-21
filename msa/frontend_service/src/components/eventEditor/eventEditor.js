// import { DateTimePicker } from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import MDEditor from '@uiw/react-md-editor'
import cl from 'clsx'
import dayjs, { Dayjs } from 'dayjs'
import React from 'react'
import { Button, ButtonGroup, Col, Container, Form, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import rehypeSanitize from 'rehype-sanitize'

import api, { getFileContent } from '../../api'
import { degrees } from '../../utilities/degreeDefinitions'
import Tag from '../tag/tag'

import './style.scss'

// Expects evid in props
class EventEditor extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      evid: null,
      enabled: false,
      isMarketplace: false,
      acceptsNewProjects: true,
      name: '',
      description: '',
      start: Dayjs,
      end: Dayjs,
      degrees: [],
      location: 'Somewhere over the rainbow',
      // studentSubmitDeadline: new Date(),
      // entities: [],

      studentImage: this.props.params.evid ? false : null,
      repImage: this.props.params.evid ? false : null,

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
    this.updateEvent = this.updateEvent.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
  }

  async componentDidMount() {
    if (this.props.params.evid) {
      const event = await api.event.get(this.props.params.evid).exec()
      event.start = dayjs(event.start)
      event.end = dayjs(event.end)
      this.setState(event)

      api.event
        .getImage(event.evid, 'student')
        .exec()
        .then(studentImage => {
          this.setState({ studentImage })
        })

      api.event
        .getImage(event.evid, 'rep')
        .exec()
        .then(repImage => {
          this.setState({ repImage })
        })
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
      start: this.state.start.toDate(),
      end: this.state.end.toDate(),
      location: this.state.location,
      enabled: this.state.enabled,
      isMarketplace: this.state.isMarketplace,
      deadlinePassed: this.state.deadlinePassed,
    }

    let evid
    // TODO: handle errors and show to user
    if (this.props.params.evid) {
      await api.event.update({ ...event, evid: this.props.params.evid }).exec()
      evid = this.props.params.evid
    } else {
      evid = (await api.event.create(event).exec()).evid
    }

    // Upload images
    if (this.state.studentImage && evid) {
      await api.event.updateImage(evid, 'student', this.state.studentImage).exec()
    }

    if (this.state.repImage && evid) {
      await api.event.updateImage(evid, 'rep', this.state.repImage).exec()
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
    location: () => true,
  }

  localToUTCTime = (date, hours, minutes) => {
    const offsetMinutes = date.getTimezoneOffset()
    const offsetHours = Math.floor(offsetMinutes / 60)
    const offsetMinutesRemainder = offsetMinutes % 60

    date.setUTCHours(hours + offsetHours)
    date.setUTCMinutes(minutes + offsetMinutesRemainder)

    return date
  }

  DateToLocalTime = date => {
    const newDate = new Date()

    const offsetMinutes = newDate.getTimezoneOffset()
    const offsetHours = Math.floor(offsetMinutes / 60)
    const offsetMinutesRemainder = offsetMinutes % 60

    const hours = date.getHours() - offsetHours
    const minutes = date.getMinutes() - offsetMinutesRemainder

    newDate.setUTCHours(hours)
    newDate.setUTCMinutes(minutes)
    newDate.setUTCSeconds(0)

    return newDate
  }

  getSubmitButton = disabled => (
    <Button disabled={disabled} className='button-disabled' variant='primary' type='submit' onClick={this.submit}>
      {this.props.params.evid ? 'Update' : 'Create'} Event
    </Button>
  )

  render() {
    return (
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
            <Form.Group as={Col} controlId='start'>
              <Form.Label>Starts at</Form.Label>
              <br />
              <DateTimePicker value={this.state.start} onChange={newValue => this.setState({ start: newValue })} />
            </Form.Group>
            <Form.Group as={Col} controlId='end'>
              <Form.Label>Ends at</Form.Label>
              <br />
              <DateTimePicker value={this.state.end} onChange={newValue => this.setState({ end: newValue })} />
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
                  onClick={() => this.setState({ enabled: !this.state.enabled })}
                  checked={this.state.enabled}
                  value={this.state.enabled}
                />
              </Form.Group>
            </Col>

            <Col>
              <Form.Group className='mb-3' controlId='marketplace'>
                <Form.Label>Marketplace Event</Form.Label>
                <Form.Check
                  type='switch'
                  id='event-marketplace-switch'
                  label={
                    this.state.isMarketplace
                      ? 'This event will be marketplace only'
                      : 'This event is not marketplace only'
                  }
                  onClick={() => this.setState({ isMarketplace: !this.state.isMarketplace })}
                  checked={this.state.isMarketplace}
                  value={this.state.isMarketplace}
                />
              </Form.Group>
            </Col>

            <Col>
              <Form.Group className='mb-3' controlId='marketplace'>
                <Form.Label>Deadline passed</Form.Label>
                <Form.Check
                  type='switch'
                  id='event-deadline-switch'
                  label={
                    this.state.deadlinePassed
                      ? 'This event will not allow new projects for submission'
                      : 'This event will allow new projects for submission'
                  }
                  onClick={() => this.setState({ deadlinePassed: !this.state.deadlinePassed })}
                  checked={this.state.deadlinePassed}
                  value={this.state.deadlinePassed}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className='mb-3'>
            <Col>
              <Form.Label>Student image</Form.Label>
              {this.state.studentImage ? (
                <img width='512px' className='mt-2' src={this.state.studentImage} alt='Student event map' />
              ) : this.state.studentImage === false ? (
                <h6>
                  <em>Loading image...</em>
                </h6>
              ) : (
                <h6>
                  <em>No student image is set.</em>
                </h6>
              )}
              <Button onClick={async () => this.setState({ studentImage: await getFileContent() })}>
                Upload student image
              </Button>
            </Col>

            <Col>
              <Form.Label>Representative image</Form.Label>
              {this.state.repImage ? (
                <img width='512px' className='mt-2' src={this.state.repImage} alt='Representative event map' />
              ) : this.state.repImage === false ? (
                <h6>
                  <em>Loading image...</em>
                </h6>
              ) : (
                <h6>
                  <em>No representative image is set.</em>
                </h6>
              )}
              <Button onClick={async () => this.setState({ repImage: await getFileContent() })}>
                Upload representative image
              </Button>
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
  }
}

export default EventEditor
