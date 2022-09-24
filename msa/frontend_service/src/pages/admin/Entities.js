import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Form } from 'react-bootstrap';
import EditIcon from 'bootstrap-icons/icons/pencil-square.svg';
import SaveIcon from 'bootstrap-icons/icons/check-lg.svg';
import api from '../../api';

class TableRow extends React.Component {
  constructor(props) {
    super(props);


    this.state = {
      location: this.props.entity.location,
      editing: false,
    }
  }

  toggleEditing = async () => {
    if (!this.state.editing) {
      this.setState({ editing: true });
      return;
    }

    await api.entity.update({
      enid: this.props.entity.enid,
      location: this.state.location,
    }).exec();

    this.setState({
      editing: false,
    });
  }

  render() {
    if (this.state.editing) {
      return (
        <tr>
          <td>{this.props.entity.name}</td>
          <td><Form.Control value={this.state.location} onChange={(e) => this.setState({ location: e.target.value })} /></td>
          <td><img src={SaveIcon} alt='save' onClick={this.toggleEditing} /></td>
        </tr>
      )
    }

    return (
      <tr>
        <td>{this.props.entity.name}</td>
        <td>{this.state.location}</td>
        <td><img src={EditIcon} alt='edit' onClick={this.toggleEditing} /></td>
      </tr>
    )
  }
}

class Entities extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      event: {},
      entities: [],
    };
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid).exec();
    const entities = await api.entity.getMultiple(event.entities, { enid: true, name: true, location: true }).exec();

    this.setState({ event, entities });
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Schedule on {new Date(this.state.event.start).toLocaleString('NL-nl').split(' ')[0]}</h1>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Place</th>
            </tr>
          </thead>
          <tbody>
            {
              this.state.entities.map((entity) => (
                <TableRow key={entity.enid} entity={entity} />
              ))
            }
          </tbody>
        </Table>
      </Container>
    );
  }
}

function EntitiesWithParams(props) {
  const params = useParams();

  return <Entities {...props} params={params} />
};

export default EntitiesWithParams
