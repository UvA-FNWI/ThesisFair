import React from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import api from '../api'

import '../styles/login.scss'

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
      console.log(error)
      if (
        error.message === 'data and hash arguments required' ||
        error[0].message === 'data and hash arguments required'
      ) {
        // Store email in local storage
        localStorage.setItem('reset-email', this.state.email)

        // Redirect to reset password page
        window.location.replace('/resetPassword')
      } else {
        this.setState({
          loading: false,
          error: error.message || error[0].message,
        })
      }
    }
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
              <Form.Group className='login-page--error-spacing-large'>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type='text'
                  value={this.state.email}
                  onChange={e => {
                    if (this.state.error) this.setState({ error: null })

                    this.setState({ email: e.target.value })
                  }}
                  required
                  isInvalid={!!this.state.error}
                />

                <Form.Label className='mt-1'>Password</Form.Label>
                <Form.Control
                  type='password'
                  value={this.state.password}
                  onChange={e => {
                    if (this.state.error) this.setState({ error: null })

                    this.setState({ password: e.target.value })
                  }}
                  required
                  isInvalid={!!this.state.error}
                />
                <Form.Control.Feedback type='invalid'>{this.state.error}</Form.Control.Feedback>
              </Form.Group>

              <Button variant='primary' type='submit' disabled={this.state.loading}>
                {this.state.loading ? 'Submitting...' : 'Submit'}
              </Button>

              <div className='login-page__forgot-password'>
                <Link to={'/forgotPassword'}>
                  <span>Forgot password?</span>
                </Link>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default LoginPage
