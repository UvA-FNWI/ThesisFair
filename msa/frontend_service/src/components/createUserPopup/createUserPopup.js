import React from 'react'
import { Button, Form, Modal, Row, Col } from 'react-bootstrap'

class CreateUserPopup extends React.Component {
  constructor(props) {
    super(props)

    if (typeof this.props.close !== 'function') {
      console.error('[createUserPopup] Required close prop is not supplied or is not a function!')
    }

    if (typeof this.props.create !== 'function') {
      console.error('[createUserPopup] Required create prop is not supplied or is not a function!')
    }

    this.state = {
      firstname: '',
      lastname: '',
      email: '',
      phone: '',
      error: null,
    }
  }

  close = () => {
    this.props.close()
  }

  save = async () => {
    const error = await this.props.create(this.state)
    if (error) {
      this.setState({ error })
      return
    }

    this.props.close()
  }

  render() {
    return (
      <Modal show={true} onHide={this.close} size='lg'>
        <Modal.Header closeButton>Create a new user</Modal.Header>

        <Modal.Body>
          <Form onSubmit={this.updatePersonalInfo}>
            <Row className='mb-2'>
              <Col>
                <Form.Group>
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    placeholder='Enter first name'
                    value={this.state.firstname}
                    onChange={e => this.setState({ firstname: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Family Name</Form.Label>
                  <Form.Control
                    placeholder='Enter family name'
                    value={this.state.lastname}
                    onChange={e => this.setState({ lastname: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className='mb-2'>
              <Col>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type='email'
                    placeholder='Enter your email'
                    value={this.state.email}
                    onChange={e => this.setState({ email: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Phone number</Form.Label>
                  <Form.Control
                    placeholder='Enter you phone number'
                    value={this.state.phone}
                    onChange={e => this.setState({ phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <p style={{ color: 'red' }}>{this.state.error}</p>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={this.close} variant='secondary'>
            Cancel
          </Button>
          <Button onClick={this.save}>Create</Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

export default CreateUserPopup
