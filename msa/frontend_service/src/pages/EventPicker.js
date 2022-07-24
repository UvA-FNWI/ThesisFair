import React from 'react';
import { Modal, Accordion, Button } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import api from '../api';

class EventPicker extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      events: [],
      redirect: false,
    };
  }

  async componentDidMount() {
    const events = await api.event.getAll().exec();
    this.setState({ events });
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
          <Accordion>
            { this.state.events.map((event, i) => (
              <Accordion.Item key={i} eventKey={i}>
                <Accordion.Header>
                  {event.name}
                  <Button className='ms-auto' onClick={() => this.setState({ redirect: `/${event.evid}` })}>Select</Button>
                </Accordion.Header>
                <Accordion.Body>
                  {event.description}
                </Accordion.Body>
              </Accordion.Item>
            )) }

          </Accordion>
        </Modal.Body>
      </Modal.Dialog>
    );
  }
}

export default EventPicker
