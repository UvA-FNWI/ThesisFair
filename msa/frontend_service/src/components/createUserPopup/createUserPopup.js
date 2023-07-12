import React from 'react'
import { Button, Form, Modal, Row, Col } from 'react-bootstrap'

class AddContactPopup extends React.Component {
  constructor(props) {
    super(props)

    if (typeof this.props.close !== 'function') {
      console.error('[createUserPopup] Required close prop is not supplied or is not a function!')
    }

    if (typeof this.props.create !== 'function') {
      console.error('[createUserPopup] Required create prop is not supplied or is not a function!')
    }

    this.state = {
      type: 'website',
      value: '',
      error: null,
    }
  }

  close = () => {
    this.props.close()
  }

  save = async () => {
    if (!this.state.value) return this.setState({ error: 'Please enter a value' })

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
        <Modal.Header closeButton>Add a new contact entry</Modal.Header>

        <Modal.Body>
          <Form>
            <Row className='mb-2'>
              <Col>
                {/* Option between website, email and phonenumber */}
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Control
                    as='select'
                    value={this.state.type}
                    onChange={e => this.setState({ type: e.target.value })}
                    placeholder='Select the type'
                  >
                    <option value='website'>Website</option>
                    <option value='email'>Email</option>
                    <option value='phonenumber'>Phone Number</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Value</Form.Label>
                  <Form.Control
                    placeholder='Enter the value of the contact entry'
                    value={this.state.value}
                    onChange={e => this.setState({ value: e.target.value, error: null })}
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

export default AddContactPopup
