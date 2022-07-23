import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import api from '../api';

class LoginPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      loading: false,
      error: null,
    };
  }

  submit = async (e) => {
    e.preventDefault();

    this.setState({ loading: true });
    try {
      await api.user.login(this.state.email, this.state.password);
    } catch (error) {
      console.log('error: ', error, error.message);
      this.setState({ loading: false, error: error.message });
    }
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <Col xs={0} md={9} style={{ paddingLeft: 0, overflow: 'hidden' }}>
            <img style={{ height: '100vh' }} src='/images/loginHeader.jpg' alt='' />
          </Col>
          <Col xs={12} md={3}>
            <img width='100%' src='/images/en-informatics-institute.jpg' alt='' />
            <Form onSubmit={this.submit}>
              <Form.Group className='mb-3'>
                <Form.Label>Email address</Form.Label>
                <Form.Control type='text' value={this.state.email} onChange={(e) => this.setState({ email: e.target.value })} required isInvalid={this.state.error} />
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>Password</Form.Label>
                <Form.Control type='password' value={this.state.password} onChange={(e) => this.setState({ password: e.target.value })} required isInvalid={this.state.error} />
                <Form.Control.Feedback type='invalid'>{ this.state.error }</Form.Control.Feedback>
              </Form.Group>

              <Button variant='primary' type='submit' disabled={this.state.loading}>
                { this.state.loading ? 'Submitting...' : 'Submit'}
              </Button>

              <div className='pt-3'>
                <a href='/forgot-password' className='text-muted'>
                  Forgot password?
                </a>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default LoginPage;