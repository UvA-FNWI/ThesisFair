import fuzzysort from 'fuzzysort'
import React from 'react'

import { Button, Col, Form, Row } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import api from '../../api'
import EntityCard from '../../components/entityCard/entityCard'

import '../../styles/events.scss'

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      allEvents: [],
      entitiesByEnid: {},
      entityNames: [],
      filteredEntities: [],
      searchFilter: '',
      error: false,
      isAdmin: api.getApiTokenData().type === 'a',
    }
  }

  search = searchFilter => {
    if (searchFilter === this.state.searchFilter) return
    if (searchFilter === '' || searchFilter === null) {
      this.setState({ filteredEntities: this.state.entities, searchFilter: '' })
      return
    }

    // Ignore searches with less than 3 characters
    if (this.state.searchFilter?.length < 3 && searchFilter.length < 3) return

    if (searchFilter?.length < 3) {
      this.setState({ filteredEntities: this.state.entities, searchFilter: '' })
      return
    }

    // If the search filter is extended, only search through the previous results
    if (searchFilter.startsWith(this.state.searchFilter)) {
      this.setState({
        filteredEntities: fuzzysort
          .go(searchFilter, this.state.filteredEntities, { key: 'name', limit: 25, threshold: -5000 })
          .map(e => this.state.entitiesByEnid[e.obj.enid]),
        searchFilter,
      })

      return
    }

    this.setState({
      filteredEntities: fuzzysort
        .go(searchFilter, this.state.entityNames, { key: 'name', limit: 25, threshold: -5000 })
        .map(e => this.state.entitiesByEnid[e.obj.enid]),
      searchFilter,
    })
  }

  async componentDidMount() {
    let entities
    try {
      entities = await api.entity.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!entities || entities.length === 0) {
      this.setState({ error: true })
      return
    }

    // Fetch info about all events to pass on to entries on entities, so they
    // don't have to fetch it (state passes down)
    let events
    try {
      events = await api.event.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!events || events.length === 0) {
      this.setState({ error: true })
      return
    }

    const entityNames = entities.map(entity => ({ enid: entity.enid, name: entity.name }))
    const entitiesByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity]))

    this.setState({ entities, entitiesByEnid, entityNames, filteredEntities: entities, allEvents: events })
  }

  getNoResultText() {
    switch (true) {
      // First case assumes there is at least one entity
      case !this.state.error && this.state.entities?.length === 0:
        return 'Loading...'
      case !this.state.error && this.state.filteredEntities?.length === 0:
        return 'No organisations found with the given search term.'
      default:
        return 'Something went wrong while loading the organisations.'
    }
  }

  render() {
    return (
      <>
        <h1 className='events-page__header'>Organisations</h1>
        {this.state.isAdmin && (
          <>
            <Link to='/organisation/create/'>
              <Button variant='outline-primary'>Create new organisation</Button>
            </Link>

            <Form className='search-bar'>
              <Form.Group className='mb-3' controlId='searchBar'>
                <Form.Control
                  type='text'
                  placeholder='Search (type at least 3 characters)'
                  onInput={e => this.search(e.target.value)}
                />
              </Form.Group>
            </Form>
          </>
        )}
        {this.state.filteredEntities?.length > 0 ? (
          <Row className='g-4 events-page__row'>
            {this.state.filteredEntities.map(entity => (
              <Col md='auto' key={entity.enid}>
                <EntityCard events={this.state.allEvents} entity={entity} isAdmin={this.state.isAdmin} />
              </Col>
            ))}
          </Row>
        ) : (
          <p>{this.getNoResultText()}</p>
        )}
      </>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams
