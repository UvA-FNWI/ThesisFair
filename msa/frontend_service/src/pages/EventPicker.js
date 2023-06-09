import React from 'react'
import { Modal, Accordion, Button } from 'react-bootstrap'
import { Navigate } from 'react-router-dom'
import api from '../api'

class EventPicker extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      events: [],
      loading: true,
      redirect: false,
    }
  }

  async componentDidMount() {
    const events = await api.event.getAll().exec()
    this.setState({ events, loading: false })
  }

  render() {
    if (this.state.redirect) {
      return <Navigate to={this.state.redirect} />
    }

    return (
      <Modal.Dialog>
        <Modal.Header>
          <Modal.Title>Select an event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.events.length === 0 && !this.state.loading ? <h5>You are not linked to any events</h5> : null}

          <Accordion>
            {this.state.events.map((event, i) => (
              <Accordion.Item key={i} eventKey={i}>
                <Accordion.Header>
                  {event.name}
                  <Button className='ms-auto' onClick={() => this.setState({ redirect: `/${event.evid}` })}>
                    Select
                  </Button>
                </Accordion.Header>
                <Accordion.Body>
                  <div dangerouslySetInnerHTML={{ __html: event.description }} />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Modal.Body>
      </Modal.Dialog>
    )
  }
}

export default EventPicker
