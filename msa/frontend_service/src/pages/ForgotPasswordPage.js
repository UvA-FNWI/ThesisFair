import React from 'react'
import { Container, Row, Col, Form, Button, Link } from 'react-bootstrap'
import api from '../api'

function errorMessage(error) {
  if (error.message) {
    return error.message
  } else if (error.length > 0) {
    return error[0].message
  }

  return false
}

const validateEmail = email =>
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(
    email
  )

class ForgotPasswordPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      email: props.email || '',
      resetCode: '',
      password: '',

      mailError: null,
      resetError: null,
      mailSent: false,
      passwordReset: false,
      loading: false,
    }
  }

  submit = async e => {
    e.preventDefault()
    this.setState({ loading: true })

    // Redirect to login page if password has been reset
    if (this.state.passwordReset) {
      window.location.replace('/')
    } else if (!this.state.mailSent) {
      // Validate email
      if (validateEmail(this.state.email)) {
        this.setState({ mailError: 'Invalid email', loading: false })
        return
      }

      // No mail sent, so send mail
      try {
        // await new Promise(r => setTimeout(r, 1000))
        await api.user.requestPasswordReset(this.state.email)
        this.setState({ mailSent: true, mailError: null })
      } catch (error) {
        this.setState({
          mailError:
            errorMessage(error) || 'There was a problem sending the email, please contact a system administrator',
        })
      }
    } else {
      // Send password reset request
      if (this.state.password.length < 8) {
        this.setState({
          resetError: 'Password should be 8 characters or longer',
          loading: false,
        })
        return
      }

      try {
        // await new Promise(r => setTimeout(r, 1000))
        await api.user.resetPassword(this.state.email, this.state.resetCode, this.state.password)
        this.setState({ passwordReset: true, resetError: null })
      } catch (error) {
        this.setState({
          resetError:
            errorMessage(error) || 'There was a problem resetting your password, please contact a system administrator',
        })
      }
    }

    this.setState({ loading: false })
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

            <h1 className='mt-4'>Reset password</h1>

            <Form onSubmit={this.submit}>
              <Form.Group className='login-page--error-spacing'>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type='text'
                  value={this.state.email}
                  onChange={e =>
                    this.setState({
                      email: e.target.value,
                      mailSent: false,
                      loading: false,
                      resetCode: '',
                      password: '',
                    })
                  }
                  onBlur={e => this.setState({ mailError: validateEmail(e.target.value) ? 'Invalid email' : null })}
                  required
                  isInvalid={!!this.state.mailError}
                />
                <Form.Control.Feedback type='invalid'>{this.state.mailError}</Form.Control.Feedback>
              </Form.Group>

              {this.state.mailSent && (
                <Form.Group class='login-page--top-border login-page--error-spacing-large'>
                  <Form.Label>Password reset code</Form.Label>
                  <Form.Control
                    type='text'
                    value={this.state.resetCode}
                    onChange={e => this.setState({ resetCode: e.target.value })}
                    required
                    isInvalid={!!this.state.resetError}
                  />

                  <Form.Label className='mt-1'>New password</Form.Label>
                  <Form.Control
                    type='password'
                    value={this.state.password}
                    onChange={e => this.setState({ password: e.target.value })}
                    required
                    isInvalid={!!this.state.resetError}
                  />

                  <Form.Control.Feedback type='invalid'>{this.state.resetError}</Form.Control.Feedback>
                </Form.Group>
              )}

              <Button variant='primary' type='submit' disabled={this.state.loading} className='mt-3'>
                {this.state.mailSent
                  ? this.state.loading
                    ? 'Resetting password...'
                    : this.state.resetError
                    ? 'Try again'
                    : this.state.passwordReset
                    ? 'Success! Click to login'
                    : 'Reset password'
                  : this.state.loading
                  ? 'Sending...'
                  : this.state.mailError
                  ? 'Try again'
                  : 'Send password reset email'}
              </Button>

              <div className='login-page__forgot-password'>
                <Link to={'/'}>
                  <span>Go back to the login page</span>
                </Link>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default ForgotPasswordPage
