import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import api, { getFileContent } from '../../api'

class Event extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      name: '',
      description: '',
      enabled: false,

      // Images: false is loading, null or empty is not set, string is image.
      studentImg: false,
      repImg: false,

      savingInfo: false,
    }
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid, { name: true, description: true, enabled: true }).exec()
    this.setState({ name: event.name, description: event.description, enabled: event.enabled })

    api.event
      .getImage(this.props.params.evid, 'student')
      .exec()
      .then(studentImg => {
        this.setState({ studentImg })
      })

    api.event
      .getImage(this.props.params.evid, 'rep')
      .exec()
      .then(repImg => {
        this.setState({ repImg })
      })
  }

  updateEvent = async e => {
    e.preventDefault()

    this.setState({ savingInfo: true })
    await api.event
      .update({
        evid: this.props.params.evid,
        name: this.state.name,
        description: this.state.description,
        enabled: this.state.enabled,
      })
      .exec()
    this.setState({ savingInfo: false, showInfoSaved: true })
    setTimeout(() => {
      this.setState({ showInfoSaved: false })
    }, 2000)
  }

  uploadImage = async type => {
    const img = await getFileContent()
    await api.event.updateImage(this.props.params.evid, type, img).exec()

    this.setState({ [`${type}Img`]: img })
  }

  render() {
    return (
      <Container className='mt-2'>
        <h2>Event</h2>
        <div className='mb-4'>
          <div>
            <Form onSubmit={this.updateEvent}>
              <Row className='mb-2'>
                <Col>
                  <Form.Group>
                    <Form.Label>Event name</Form.Label>
                    <Form.Control
                      type='text'
                      placeholder='Enter the name of the event'
                      value={this.state.name}
                      onChange={e => this.setState({ name: e.target.value })}
                      disabled
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Event description</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows='15'
                      placeholder='Enter the description of the event'
                      value={this.state.description}
                      onChange={e => this.setState({ description: e.target.value })}
                    />
                  </Form.Group>

                  <Form.Group className='mt-2'>
                    <Form.Check
                      type='checkbox'
                      label='Event visible for students and representatives'
                      checked={this.state.enabled}
                      onChange={e => this.setState({ enabled: e.target.checked })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className='d-flex gap-2 align-items-center'>
                <Button type='submit' disabled={this.savingInfo}>
                  {this.savingInfo ? 'Saving...' : 'Update event'}
                </Button>
                {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
              </div>
            </Form>
          </div>
        </div>

        <h2>Images</h2>
        <div className='mt-2'>
          <h3>Student</h3>
          <Button onClick={() => this.uploadImage('student')}>Upload student image</Button> <br />
          {this.state.studentImg ? (
            <img width='512px' className='mt-2' src={this.state.studentImg} alt='Student event map' />
          ) : this.state.studentImg === false ? (
            <h6>
              <em>Loading image...</em>
            </h6>
          ) : (
            <h6>
              <em>No student image is set.</em>
            </h6>
          )}
        </div>

        <div className='mt-2'>
          <h3>Representative</h3>
          <Button onClick={() => this.uploadImage('rep')}>Upload representative image</Button> <br />
          {this.state.repImg ? (
            <img width='512px' className='mt-2' src={this.state.repImg} alt='Representative event map' />
          ) : this.state.repImg === false ? (
            <h6>
              <em>Loading image...</em>
            </h6>
          ) : (
            <h6>
              <em>No representative image is set.</em>
            </h6>
          )}
        </div>
      </Container>
    )
  }
}

function EventWithParams(props) {
  const params = useParams()
  return <Event params={params} {...props} />
}

export default EventWithParams
