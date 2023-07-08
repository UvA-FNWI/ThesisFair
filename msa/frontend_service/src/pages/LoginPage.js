import React from 'react'
import { Container, Row, Col, Form, Button, Popover, OverlayTrigger } from 'react-bootstrap'
import api from '../api'

import './login.scss'

class LoginPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      password: '',
      loading: false,
      error: null,
    }
  }

  submit = async e => {
    e.preventDefault()

    this.setState({ loading: true })
    try {
      await api.user.login(this.state.email, this.state.password)
    } catch (error) {
      this.setState({
        loading: false,
        error: error.message || error[0].message,
      })
    }
  }

  forgotPasswordPopover = () => {
    return (
      <Popover>
        <Popover.Header>Forgot password</Popover.Header>
        <Popover.Body>
          <p>
            Ask your colleague who is an admin representative to delete and recreate your account. Your new password
            will be in the welcome email.
          </p>

          <p>If you are the only admin representative ask your contact at the UvA to recreate your account.</p>
        </Popover.Body>
      </Popover>
    )
  }

  render() {
    return (
      <Container fluid className='login-page' style={{ backgroundColor: 'var(--primary)' }}>
        <Row>
          <div className='col-md-6 col-lg-7 login-page__banner'>
            <img
              align='right'
              style={{ maxWidth: '100%', maxHeight: '80vh' }}
              src='/images/thesisfair-banner.png'
              alt=''
            />
          </div>
          <Col
            xs={12}
            md={6}
            lg={5}
            style={{
              height: '100vh',
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
              padding: '0 4rem',
            }}
          >
            <img width='100%' src='/images/uva-thesisfair-logo.png' alt='' />
            <a href='/sso/login' className='d-flex justify-content-center pt-2 text-decoration-none'>
              <Button>UvA student and employee login</Button>
            </a>
            <div className='w-100 text-center pt-2 pb-2'>OR</div>
            <Form onSubmit={this.submit}>
              <Form.Group className='mb-3'>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type='text'
                  value={this.state.email}
                  onChange={e => this.setState({ email: e.target.value })}
                  required
                  isInvalid={!!this.state.error}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type='password'
                  value={this.state.password}
                  onChange={e => this.setState({ password: e.target.value })}
                  required
                  isInvalid={!!this.state.error}
                />
                <Form.Control.Feedback type='invalid'>{this.state.error}</Form.Control.Feedback>
              </Form.Group>
              <div className='login-page__forgot-password'>
                <OverlayTrigger trigger='click' placement='bottom' overlay={this.forgotPasswordPopover()}>
                  <span>Forgot password?</span>
                </OverlayTrigger>
              </div>

              <Button variant='primary' type='submit' disabled={this.state.loading}>
                {this.state.loading ? 'Submitting...' : 'Submit'}
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default LoginPage
