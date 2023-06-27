import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

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
    console.log('EventPicker: componentDidMount')
    const events = await api.event.getAll().exec()
    console.log('EventPicker: componentDidMount: got events', events)
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
                  <div className='w-100 d-flex align-items-center me-3'>
                    <p style={{ margin: 0 }}>{event.name}</p>
                    <Button className='ms-auto' onClick={() => this.setState({ redirect: `/${event.evid}` })}>
                      Select
                    </Button>
                  </div>
                </Accordion.Header>
                <Accordion.Body data-color-mode='light'>
                  <MDEditor.Markdown
                    source={event.description}
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
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
