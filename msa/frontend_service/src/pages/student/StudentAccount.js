import React from 'react';
import { Container, Row, Col, Form, Button, CloseButton } from 'react-bootstrap';
import api, { downloadCV } from '../../api';

class StudentAccount extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      firstname: '',
      lastname: '',
      phone: '',
      studentnumber: '',
      studies: [],
      websites: [],

      cvPresence: true,
      savingCV: false,

      savingInfo: false,
      showInfoSaved: false,

      savingLinks: false,
      showLinksSaved: false,
    };
  }

  async componentDidMount() {
    const user = await api.user.get(api.getApiTokenData().uid, { share: false, uid: false }).exec();
    const websites = user.websites;

    while (websites.length < 2) {
      websites.push('');
    }

    this.setState({ email: user.email, firstname: user.firstname, lastname: user.lastname, phone: user.phone, studentnumber: user.studentnumber, studies: user.studies, websites: websites });

    this.setState({ cvPresence: await api.user.student.getCV(api.getApiTokenData().uid, true).exec() === 'present' })
  }

  updatePersonalInfo = async (e) => {
    e.preventDefault();

    this.setState({ savingInfo: true });
    await api.user.student.update({
      uid: api.getApiTokenData().uid,
      firstname: this.state.firstname,
      lastname: this.state.lastname,
      email: this.state.email,
      phone: this.state.phone
    }).exec();
    this.setState({ savingInfo: false, showInfoSaved: true });
    setTimeout(() => {
      this.setState({ showInfoSaved: false });
    }, 2000);
  }

  updateLinks = async () => {
    this.setState({ savingLinks: true });
    await api.user.student.update({
      uid: api.getApiTokenData().uid,
      websites: this.state.websites
    }).exec();
    this.setState({ savingLinks: false, showLinksSaved: true });
    setTimeout(() => {
      this.setState({ showLinksSaved: false });
    }, 2000);
  }

  uploadCV = () => {
    this.setState({ savingCV: true });
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const blob = input.files.item(0);
      if (!blob) {
        input.remove();
        this.setState({ savingCV: false });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {

        input.remove();
        await api.user.student.uploadCV(api.getApiTokenData().uid, reader.result).exec();
        this.setState({ savingCV: false, cvPresence: true });
      }
      reader.readAsDataURL(blob);
    }
    input.click();
  }



  render() { // TODO: save automatically by deferring
    return (
      <Container className='mt-2'>
        <h2>Your Personal Info</h2>
        <div className='mb-4'>
          {/* <div className='me-4'>
            <div className='d-flex'>
              <img width='128px' height='128px' src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=192&h=192&q=80" alt='Profile' style={{ marginLeft: 'auto', marginRight: 'auto' }} />
            </div>
            <div className='d-flex justify-content-center gap-2 mt-2'>
              <Button>Upload</Button>
              <Button>Delete</Button>
            </div>
          </div> */}

          <div>
            <Form onSubmit={this.updatePersonalInfo}>
              <Row className='mb-2'>
                <Col>
                  <Form.Group>
                    <Form.Label>Firstname</Form.Label>
                    <Form.Control placeholder='Enter firstname' value={this.state.firstname} onChange={(e) => this.setState({ firstname: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Lastname</Form.Label>
                    <Form.Control placeholder='Enter lastname' value={this.state.lastname} onChange={(e) => this.setState({ lastname: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row className='mb-2'>
                <Col>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control type='email' placeholder='Enter you email' value={this.state.email} onChange={(e) => this.setState({ email: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Phone number</Form.Label>
                    <Form.Control placeholder='Enter you phone number' value={this.state.phone} onChange={(e) => this.setState({ phone: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <div className='d-flex gap-2 align-items-center'>
                <Button type='submit' disabled={this.savingInfo}>{this.savingInfo ? 'Saving...' : 'Update personal info'}</Button>
                {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
              </div>
            </Form>
          </div>
        </div>

        <div>
          <h2>Your Studies</h2>
          <ul>
            {this.state.studies.map((study, i) => <li key={i}>{study}</li>)}
          </ul>
        </div>

        <div>
          <h2>Your Curriculum Vitae</h2>
          <Button onClick={this.uploadCV} className='me-1' disabled={this.savingCV}>{this.savingCV ? 'Saving CV...' : 'Upload CV'}</Button>
          {this.state.cvPresence ? <Button onClick={() => downloadCV(api.getApiTokenData().uid)} >Download your CV</Button> : null}
          <p className='fs-6'><em>By uploading your CV you agree to share your CV with the participating organisations</em></p>
        </div>

        <div>
          <h2 className='mb-0'>Links</h2>
          <h6><em>I.e. your Linked In/websites/github/blog posts</em></h6>
          {this.state.websites.map((website, i) =>
            <div key={i} style={{ position: 'relative' }}>
              <Form.Control className='mb-2' value={website} onChange={(e) => { const websites = [...this.state.websites]; websites[i] = e.target.value; this.setState({ websites }) }} />
              <CloseButton style={{ position: 'absolute', top: '7px', right: '7px' }} onClick={() => { const websites = [...this.state.websites]; websites.splice(i, 1); this.setState({ websites }); }} />
            </div>
          )}

          <div className='d-flex gap-2 align-items-center'>
            <Button className='me-2' onClick={() => this.setState({ websites: [...this.state.websites, ''] })}>Add link</Button>
            <Button disabled={this.saving} onClick={this.updateLinks} >{this.saving ? 'Saving...' : 'Update'}</Button>
            {this.state.showLinksSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
          </div>
        </div>
      </Container>
    );
  }
}

export default StudentAccount;
