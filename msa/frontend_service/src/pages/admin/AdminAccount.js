import React from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import api from "../../api";

class AdminAccount extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",

      savingInfo: false,
      showInfoSaved: false,

      savingPassword: false,
      showPasswordSaved: false,
      passwordError: false,
    };
  }

  async componentDidMount() {
    const user = await api.user
      .get(api.getApiTokenData().uid, { email: true })
      .exec();
    this.setState({ email: user.email });
  }

  updateEmail = async (e) => {
    e.preventDefault();

    this.setState({ savingInfo: true });
    await api.user.admin
      .update({
        uid: api.getApiTokenData().uid,
        email: this.state.email,
      })
      .exec();
    this.setState({ savingInfo: false, showInfoSaved: true });
    setTimeout(() => {
      this.setState({ showInfoSaved: false });
    }, 2000);
  };

  render() {
    return (
      <Container className="mt-2">
        <h2>Account information</h2>
        <div className="mb-4">
          <div>
            <Form onSubmit={this.updateEmail}>
              <Row className="mb-2">
                <Col>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={this.state.email}
                      onChange={(e) => this.setState({ email: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex gap-2 align-items-center">
                <Button type="submit" disabled={this.savingInfo}>
                  {this.savingInfo
                    ? "Saving..."
                    : "Update personal information"}
                </Button>
                {this.state.showInfoSaved ? (
                  <h6 style={{ color: "green", margin: 0 }}>Saved</h6>
                ) : null}
              </div>
            </Form>
          </div>
        </div>
      </Container>
    );
  }
}

export default AdminAccount;
