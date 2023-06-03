import React from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  CloseButton,
} from "react-bootstrap";
import cvUploadedIcon from "bootstrap-icons/icons/file-earmark-check.svg";
import api, { downloadCV, getFileContent } from "../../api";

class StudentAccount extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      firstname: "",
      lastname: "",
      phone: "",
      studentnumber: "",
      studies: [],
      websites: [],

      cvPresence: true,
      savingCV: false,
      errorCV: null,

      savingInfo: false,
      showInfoSaved: false,

      savingLinks: false,
      showLinksSaved: false,

      sharingAll: false,
      shareAllDone: false,
    };
  }

  async componentDidMount() {
    const user = await api.user
      .get(api.getApiTokenData().uid, { share: false, uid: false })
      .exec();
    const websites = user.websites;

    while (websites.length < 2) {
      websites.push("");
    }

    this.setState({
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      studentnumber: user.studentnumber,
      studies: user.studies,
      websites: websites,
    });

    this.setState({
      cvPresence:
        (await api.user.student
          .getCV(api.getApiTokenData().uid, true)
          .exec()) === "present",
    });
  }

  updatePersonalInfo = async (e) => {
    e.preventDefault();

    this.setState({ savingInfo: true });
    await api.user.student
      .update({
        uid: api.getApiTokenData().uid,
        firstname: this.state.firstname,
        lastname: this.state.lastname,
        email: this.state.email,
        phone: this.state.phone,
      })
      .exec();
    this.setState({ savingInfo: false, showInfoSaved: true });
    setTimeout(() => {
      this.setState({ showInfoSaved: false });
    }, 2000);
  };

  updateLinks = async () => {
    this.setState({ savingLinks: true });
    await api.user.student
      .update({
        uid: api.getApiTokenData().uid,
        websites: this.state.websites,
      })
      .exec();
    this.setState({ savingLinks: false, showLinksSaved: true });
    setTimeout(() => {
      this.setState({ showLinksSaved: false });
    }, 2000);
  };

  uploadCV = async () => {
    this.setState({ savingCV: true });
    const cv = await getFileContent();
    if (!cv) {
      this.setState({ savingCV: false });
      return;
    }

    try {
      await api.user.student.uploadCV(api.getApiTokenData().uid, cv).exec();
    } catch (error) {
      console.error(error);
      this.setState({ savingCV: false, errorCV: error.toString() });
      return;
    }

    this.setState({ savingCV: false, cvPresence: true, errorCV: null });
  };

  shareAll = async () => {
    this.setState({ sharingAll: true });
    const event = await api.event
      .get(this.props.params.evid, { entities: true })
      .exec();
    for (const enid of event.entities) {
      await api.user.student
        .shareInfo(api.getApiTokenData().uid, enid, true)
        .exec();
    }

    this.setState({ sharingAll: false, shareAllDone: true });
  };

  render() {
    return (
      <Container className="mt-2">
        <h2>Account information</h2>
        <div className="mb-4">
          <div>
            <Form onSubmit={this.updatePersonalInfo}>
              <Row className="mb-2">
                <Col>
                  <Form.Group>
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      placeholder="Enter your first name"
                      value={this.state.firstname}
                      onChange={(e) =>
                        this.setState({ firstname: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Family Name</Form.Label>
                    <Form.Control
                      placeholder="Enter your family name"
                      value={this.state.lastname}
                      onChange={(e) =>
                        this.setState({ lastname: e.target.value })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>

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
                <Col>
                  <Form.Group>
                    <Form.Label>Phone number</Form.Label>
                    <Form.Control
                      placeholder="Enter you phone number"
                      value={this.state.phone}
                      onChange={(e) => this.setState({ phone: e.target.value })}
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

        <div>
          <h2>Your Studies</h2>
          <ul>
            {this.state.studies.map((study, i) => (
              <li key={i}>{study}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2>
            Your Curriculum Vitae{" "}
            {this.state.cvPresence ? <img src={cvUploadedIcon} alt="" /> : null}
          </h2>
          <Button
            onClick={this.uploadCV}
            className="me-1"
            disabled={this.savingCV}
          >
            {this.savingCV
              ? "Saving CV..."
              : this.state.cvPresence
              ? "Re-upload CV"
              : "Upload CV"}
          </Button>
          {this.state.cvPresence ? (
            <Button onClick={() => downloadCV(api.getApiTokenData().uid)}>
              Download your CV
            </Button>
          ) : null}
          <p className="fs-6">
            <em>
              By uploading your CV you agree to share your CV with the
              participating organisations
            </em>
          </p>
          {this.state.errorCV ? (
            <p style={{ color: "red" }}>{this.state.errorCV}</p>
          ) : null}
        </div>

        <div>
          <h2 className="mb-0">Profile Sharing Permissions</h2>
          <p className="fs-6">
            <em>
              The options below determine which organisations can see your
              profile and uploaded CV
            </em>
          </p>
          <Button
            disabled={this.state.sharingAll || this.state.shareAllDone}
            onClick={this.shareAll}
          >
            Give all companies access
          </Button>
          {this.state.shareAllDone ? (
            <p style={{ color: "green" }}>
              All companies have been given access to your data
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="mb-0">Links</h2>
          <p className="fs-6">
            <em>I.e. your LinkedIn/websites/GitHub/blog posts</em>
          </p>
          {this.state.websites.map((website, i) => (
            <div key={i} style={{ position: "relative" }}>
              <Form.Control
                className="mb-2"
                value={website}
                onChange={(e) => {
                  const websites = [...this.state.websites];
                  websites[i] = e.target.value;
                  this.setState({ websites });
                }}
              />
              <CloseButton
                style={{ position: "absolute", top: "7px", right: "7px" }}
                onClick={() => {
                  const websites = [...this.state.websites];
                  websites.splice(i, 1);
                  this.setState({ websites });
                }}
              />
            </div>
          ))}

          <div className="d-flex gap-2 align-items-center">
            <Button
              className="me-2"
              onClick={() =>
                this.setState({ websites: [...this.state.websites, ""] })
              }
            >
              Add link
            </Button>
            <Button disabled={this.saving} onClick={this.updateLinks}>
              {this.saving ? "Saving..." : "Update"}
            </Button>
            {this.state.showLinksSaved ? (
              <h6 style={{ color: "green", margin: 0 }}>Saved</h6>
            ) : null}
          </div>
        </div>
      </Container>
    );
  }
}

function StudentAccountWithParams(props) {
  const params = useParams();

  return <StudentAccount {...props} params={params} />;
}

export default StudentAccountWithParams;
