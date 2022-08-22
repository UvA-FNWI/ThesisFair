import React from 'react';
import { Container, CloseButton, Form, Button, Row, Col, Card } from 'react-bootstrap';
import makeAdminIcon from 'bootstrap-icons/icons/star.svg';
import isAdminIcon from 'bootstrap-icons/icons/star-fill.svg';
import deleteIcon from 'bootstrap-icons/icons/x-lg.svg';
import api from '../../api';
import CreateUserPopup from '../../components/createUserPopup/createUserPopup';

class OrganisationDashboard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      description: '',
      contact: [],
      users: [],

      savingInfo: false,
      showInfoSaved: false,

      savingContact: false,
      showContactSaved: false,

      newUserPopup: false,
    };
  }

  async componentDidMount() {
    const entity = await api.entity.get(api.getApiTokenData().enid).exec();
    const users = await api.user.getOfEntity(api.getApiTokenData().enid).exec();


    this.setState({ name: entity.name, description: entity.description, contact: entity.contact, users: users });
  }

  updatePersonalInfo = async (e) => {
    e.preventDefault();

    this.setState({ savingInfo: true });
    await api.entity.update({
      enid: api.getApiTokenData().enid,
      name: this.state.name,
      description: this.state.description,
    }).exec();
    this.setState({ savingInfo: false, showInfoSaved: true });
    setTimeout(() => {
      this.setState({ showInfoSaved: false });
    }, 2000);
  }

  updateContactInfo = async (e) => {
    e.preventDefault();

    this.setState({ savingContact: true });
    await api.entity.update({
      enid: api.getApiTokenData().enid,
      contact: this.state.contact,
    }).exec();
    this.setState({ savingContact: false, showContactSaved: true });
    setTimeout(() => {
      this.setState({ showContactSaved: false });
    }, 2000);
  }

  toggleAdmin = async (userIndex) => {
    const user = this.state.users[userIndex];

    await api.user.representative.update({
      uid: user.uid,
      repAdmin: !user.repAdmin,
    }).exec();

    const newUsers = [...this.state.users];
    newUsers[userIndex].repAdmin = !user.repAdmin;
    this.setState({ users: newUsers });
  }

  deleteUser = async (userIndex) => {
    const user = this.state.users[userIndex];

    if (!window.confirm(`Are you sure you want to delete user "${user.firstname} ${user.lastname}"?`)) {
      return;
    }

    await api.user.delete(user.uid).exec();

    const newUsers = [...this.state.users];
    newUsers.splice(userIndex, 1);
    this.setState({ users: newUsers });
  }

  createUser = async (user) => {
    const newUser = await api.user.representative.create({
      enid: api.getApiTokenData().enid,
      ...user
    }).exec();

    const newUsers = [...this.state.users];
    newUsers.push(newUser);
    this.setState({ users: newUsers });
  }

  render() { // TODO: save automatically by deferring
    return (
      <>
        <Container className='mt-2'>
          <h2>Organisation Information</h2>
          <h6><em>This is what the students will see.</em></h6>
          <div className='mb-4'>
            <div>
              <Form onSubmit={this.updatePersonalInfo}>
                <div className='mb-2'>
                  <Form.Group>
                    <Form.Label>Name</Form.Label>
                    <Form.Control placeholder='Enter organisation name' value={this.state.name} onChange={(e) => this.setState({ name: e.target.value })} required />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control as='textarea' rows={8} placeholder='Enter description' value={this.state.description} onChange={(e) => this.setState({ description: e.target.value })} required />
                  </Form.Group>
                </div>

                <div className='d-flex gap-2 align-items-center'>
                  <Button type='submit' disabled={this.savingInfo}>{this.savingInfo ? 'Saving...' : 'Update information'}</Button>
                  {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
                </div>
              </Form>
            </div>
          </div>

          <div className='mb-4'>
            <h2>Organisation Contact Information</h2>
            <Form onSubmit={this.updateContactInfo}>
              {this.state.contact.map((contact, i) =>
                <Row key={i}>
                  <Col xs={2}>
                    <Form.Select className='mb-2' value={contact.type} onChange={(e) => { const newContact = [...this.state.contact]; newContact[i].type = e.target.value; this.setState({ contact: newContact }) }}>
                      <option>website</option>
                      <option>email</option>
                      <option>phonenumber</option>
                    </Form.Select>
                  </Col>
                  <Col style={{ position: 'relative' }}>
                    <Form.Control className='mb-2' value={contact.content} onChange={(e) => { const newContact = [...this.state.contact]; newContact[i].content = e.target.value; this.setState({ contact: newContact }) }} />
                    <CloseButton style={{ position: 'absolute', top: '7px', right: '18px' }} onClick={() => { const newContact = [...this.state.contact]; newContact.splice(i, 1); this.setState({ contact: newContact }); }} />
                  </Col>
                </Row>
              )}

              <div className='d-flex gap-2 align-items-center'>
                <Button type='submit' disabled={this.savingContact}>{this.savingContact ? 'Saving...' : 'Update contact information'}</Button>
                {this.state.showContactSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
              </div>
            </Form>
          </div>


          <div>
            <h2>Company Accounts</h2>
            <div>
              {this.state.users.map((user, userIndex) => (
                <Card key={userIndex} className='mb-2'>
                  <Card.Body className='d-flex justify-content-between align-items-center'>
                    <p className='m-0'>
                      {user.firstname} {user.lastname} - {user.email}
                    </p>
                    <div>
                      <img src={user.repAdmin ? isAdminIcon : makeAdminIcon} alt='Toggle admin state' style={{ cursor: 'pointer' }} className='me-2' onClick={() => this.toggleAdmin(userIndex)} />
                      <img src={deleteIcon} alt='Delet user' style={{ cursor: 'pointer' }} onClick={() => this.deleteUser(userIndex)} />
                    </div>
                  </Card.Body>
                </Card>
              ))}

              <Button onClick={() => this.setState({ newUserPopup: true })}>Create new account</Button>
            </div>
          </div>
        </Container>

        { this.state.newUserPopup ? <CreateUserPopup close={() => this.setState({ newUserPopup: false })} create={this.createUser} /> : null }
      </>
    );
  }
}

export default OrganisationDashboard;
