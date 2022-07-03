import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import api from '../../api';

class StudentHome extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  submit = async (e) => {
    e.preventDefault();

    this.setState({ loading: true });
    try {
      await api.user.login(this.state.email, this.state.password);
      this.setState({ redirect: true });
    } catch (error) {
      console.log('error: ', error, error.message);
      this.setState({ loading: false, error: error.message });
    }
  }

  render() {
    return (
      'student home'
    );
  }
}

export default StudentHome;
