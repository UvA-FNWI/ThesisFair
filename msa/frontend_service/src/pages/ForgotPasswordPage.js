import React from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import api from '../api'

function errorMessage(error) {
  if (error.message) {
    return error.message
  } else if (error.length > 0) {
    return error[0].message
  }

  return false
}

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
      loading: false,
    }
  }

  submit = async e => {
    e.preventDefault()

    this.setState({ loading: true })

    if (!this.state.mailSent) {
      try {
        await api.user.requestPasswordReset(this.state.email)
        this.setState({ mailSent: true, mailError: null })
      } catch (error) {
        this.setState({
          mailError: errorMessage(error) ||
            "There was a problem sending the email, please contact a system administrator",
        })
      }
    } else {
      try {
        await api.user.resetPassword(this.state.email, this.state.resetCode, this.state.password)
        this.setState({ resetError: null })
      } catch (error) {
        this.setState({
          resetError: errorMessage(error) ||
            "There was a problem resetting your password, please contact a system administrator",
        })
      }
    }

    this.setState({ loading: false })
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <div className='col-md-7 col-lg-8 d-none d-md-block' style={{ paddingLeft: 0, overflow: 'hidden' }}>
            <img align='right' style={{ height: '100vh' }} src='/images/loginHeaderCompressed.jpg' alt='' />
          </div>
          <Col xs={12} md={5} lg={4}>
            <img width='100%' src='/images/en-informatics-institute.jpg' alt='' />
            <a href='/sso/login' className='d-flex justify-content-center pt-2 text-decoration-none'>
              <Button>UvA student and employee login</Button>
            </a>
            <div className='w-100 text-center pt-2 pb-2'>OR</div>
            <Form onSubmit={this.submit}>
              <Form.Group>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type='text'
                  value={this.state.email}
                  onChange={e => this.setState({ email: e.target.value })}
                  required
                  isInvalid={!!this.state.mailError}
                />
                <Form.Control.Feedback type='invalid'>{this.state.mailError}</Form.Control.Feedback>
              </Form.Group>

              {this.state.mailSent &&
                <Form.Group>
                  <Form.Label className='mt-3'>Password reset code</Form.Label>
                  <Form.Control
                    type='text'
                    value={this.state.resetCode}
                    onChange={e => this.setState({ resetCode: e.target.value })}
                    required
                    isInvalid={!!this.state.resetError}
                  />

                  <Form.Label className='mt-3'>New password</Form.Label>
                  <Form.Control
                    type='text'
                    value={this.state.password}
                    onChange={e => this.setState({ password: e.target.value })}
                    required
                    isInvalid={!!this.state.resetError}
                  />

                  <Form.Control.Feedback type='invalid'>{this.state.resetError}</Form.Control.Feedback>
                </Form.Group>
              }

              <Button
                variant='primary'
                type='submit'
                disabled={this.state.loading}
                className='mt-3'
              >
                {this.state.mailSent ?
                  (this.state.loading ? 'Resetting password...' :
                    (!!this.state.resetError ? 'Try again' : 'Reset password')
                  ) :
                  (this.state.loading ? 'Sending...' :
                    (!!this.state.mailError ? 'Try again' : 'Send password reset email')
                  )
                }
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default ForgotPasswordPage
