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
      this.setState({ loading: false, error: error.message || error[0].message });
    }
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
            <a href="/sso/login" className='d-flex justify-content-center pt-2 text-decoration-none'>
              <Button>UvA student and employee login</Button>
            </a>
            <div className='w-100 text-center pt-2 pb-2'>OR</div>
            <Form onSubmit={this.submit}>
              <Form.Group className='mb-3'>
                <Form.Label>Email address</Form.Label>
                <Form.Control type='text' value={this.state.email} onChange={(e) => this.setState({ email: e.target.value })} required isInvalid={!!this.state.error} />
              </Form.Group>
              <Form.Group className='mb-3'>
                <Form.Label>Password</Form.Label>
                <Form.Control type='password' value={this.state.password} onChange={(e) => this.setState({ password: e.target.value })} required isInvalid={!!this.state.error} />
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
