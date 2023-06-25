import React from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import api from '../../api'

class OrganizationInfo extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      name: '',
      description: '',
      contact: [],
    }
  }

  async componentDidMount() {
    const entity = await api.entity.get(api.getApiTokenData().enid).exec()
    this.setState({ name: entity.name, description: entity.description, contact: entity.contact })
  }

  render() {
    return (
      <>
        <Container className='mt-4'>
          <h2>Organisation Information</h2>
          <div className='mb-4'>
            <div>
              <Form>
                <div className='mb-2'>
                  <Form.Group>
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      placeholder='Enter organisation name'
                      value={this.state.name}
                      disabled
                    />
                  </Form.Group>
                  <Form.Group className='mt-2'>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={8}
                      placeholder='Enter description'
                      value={this.state.description}
                      disabled
                    />
                  </Form.Group>
                </div>
              </Form>
            </div>
          </div>

          <div className='mb-4'>
            <h2>Contact Information</h2>
            <Form>
              {this.state.contact.map((contact, _) => (
                <Form.Group as={Row}>
                  <Form.Label column sm="2">{contact.type}</Form.Label>
                  <Col sm="10">
                    <Form.Control className='mb-2' value={contact.content} disabled />
                  </Col>
                </Form.Group>
              ))}
            </Form>
          </div>
        </Container>
      </>
    )
  }
}


class RepAccount extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      firstname: '',
      lastname: '',
      phone: '',

      password: '',
      passwordCheck: '',

      savingInfo: false,
      showInfoSaved: false,

      savingPassword: false,
      showPasswordSaved: false,
      passwordError: false,
    }
  }

  async componentDidMount() {
    const user = await api.user.get(api.getApiTokenData().uid).exec()

    this.setState({
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
    })
  }

  updatePersonalInfo = async e => {
    e.preventDefault()

    this.setState({ savingInfo: true })
    await api.user.representative
      .update({
        uid: api.getApiTokenData().uid,
        firstname: this.state.firstname,
        lastname: this.state.lastname,
        email: this.state.email,
        phone: this.state.phone,
      })
      .exec()
    this.setState({ savingInfo: false, showInfoSaved: true })
    setTimeout(() => {
      this.setState({ showInfoSaved: false })
    }, 2000)
  }

  updatePassword = async e => {
    e.preventDefault()

    if (this.state.password !== this.state.passwordCheck) {
      this.setState({ passwordError: 'Passwords do not match' })
      return
    }

    if (this.state.password.length < 8) {
      this.setState({
        passwordError: 'Password should be 8 characters or longer',
      })
      return
    }

    this.setState({ savingPassword: true, passwordError: false })
    await api.user.representative
      .update({
        uid: api.getApiTokenData().uid,
        password: this.state.password,
      })
      .exec()
    this.setState({ savingPassword: false, showPasswordSaved: true })
    setTimeout(() => {
      this.setState({ showPasswordSaved: false })
    }, 2000)
  }

  render() {
    return (
      <Container className='mt-2'>
        <h2>Account information</h2>
        <div className='mb-4'>
          <div>
            <Form onSubmit={this.updatePersonalInfo}>
              <Row className='mb-2'>
                <Col>
                  <Form.Group>
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      placeholder='Enter your first name'
                      value={this.state.firstname}
                      onChange={e => this.setState({ firstname: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Family name</Form.Label>
                    <Form.Control
                      placeholder='Enter your family name'
                      value={this.state.lastname}
                      onChange={e => this.setState({ lastname: e.target.value })}
                      required
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
                      required
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Phone number</Form.Label>
                    <Form.Control
                      placeholder='Enter you phonenumber'
                      value={this.state.phone}
                      onChange={e => this.setState({ phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className='d-flex gap-2 align-items-center'>
                <Button type='submit' disabled={this.savingInfo}>
                  {this.savingInfo ? 'Saving...' : 'Update personal information'}
                </Button>
                {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
              </div>
            </Form>
          </div>
        </div>

        <h2>Update password</h2>
        <Form onSubmit={this.updatePassword}>
          <div className='mb-2'>
            <Form.Control
              type='password'
              className='mb-2'
              placeholder='Enter your new password'
              value={this.state.password}
              onChange={e => this.setState({ password: e.target.value })}
              isInvalid={!!this.state.passwordError}
            />
            <Form.Control
              type='password'
              placeholder='Re-enter your new password'
              value={this.state.passwordCheck}
              onChange={e => this.setState({ passwordCheck: e.target.value })}
              isInvalid={!!this.state.passwordError}
            />
            <Form.Control.Feedback type='invalid'>{this.state.passwordError}</Form.Control.Feedback>
          </div>
          <div className='d-flex gap-2 align-items-center'>
            <Button type='submit' disabled={this.savingPassword}>
              {this.savingPassword ? 'Saving...' : 'Update password'}
            </Button>
            {this.state.showPasswordSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
          </div>
        </Form>
      </Container>
    )
  }
}

class Page extends React.Component {
  render() {
    return <>
      <RepAccount/>
      <OrganizationInfo/>
    </>
  }
}

export default Page
