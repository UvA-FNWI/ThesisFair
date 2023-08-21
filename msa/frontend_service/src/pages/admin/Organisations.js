import fuzzysort from 'fuzzysort'
import React from 'react'

import { Button, Form, Container } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import api from '../../api'
import EntityList from '../../components/entityList/entityList'
import Tag from '../../components/tag/tag'

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
    console.log('time')

    let entities
    try {
      entities = await api.entity.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    console.log('time stop')

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

  changeEntityType = async (enid, event) => {
    const type = event.target.value

    const entity = {
      enid,
      type,
    }

    try {
      await api.entity.update(entity).exec()
    } catch (error) {
      console.log(error)
    }
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

  // TODO: this exact same function is also in entityEditor -- reduce duplication
  getStatusLabel(status) {
    switch (status) {
      case 'invoice':
        return 'invoice requested'
      case 'failed':
      case 'open':
        return 'payment processing'
      case 'paid':
        return 'payment completed'
      default:
        return 'payment incomplete'
    }
  }

  render() {
    return (
      <Container>
        <h1 className='events-page__header'>Organisations</h1>

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

        {this.state.filteredEntities?.length > 0 ? (
          <EntityList
            items={this.state.filteredEntities.map(entity => ({
              name: entity.name,
              getTags: async () => {
                const events = (await api.event.getOfEntity(entity.enid).exec()) || []

                return () => (
                  <div className='entity-card__tags'>
                    {events &&
                      events.map(event => {
                        const payment = entity.payments?.filter(
                          payment =>
                            new Date(payment.eventDate).setHours(0, 0, 0, 0) ===
                            new Date(event.start).setHours(0, 0, 0, 0)
                        )?.[0]

                        if (!payment) return <></>

                        return (
                          <Tag
                            key={`payment-${event.evid}`}
                            label={`${event.name}: ${this.getStatusLabel(payment.status)}`}
                            tooltip={`Payment status: ${payment?.status || 'no attempt made'}`}
                            selectable={false}
                            onClick={() => payment?.url && window.open(payment.url, '_blank').focus()}
                          />
                        )
                      })}
                  </div>
                )
              },
              headerButtons: () => (
                <>
                  <Form.Select
                    size='md'
                    onChange={e => this.changeEntityType(entity.enid, e)}
                    defaultValue={entity.type}
                  >
                    <option value='A'>Type A</option>
                    <option value='B'>Type B</option>
                    <option value='C'>Type C</option>
                    <option value='Partner'>Type Partner</option>
                    <option value='Lab42'>Type Lab 42</option>
                    <option value='Free'>Type Free</option>
                  </Form.Select>
                  <Link to={`/organisation/${entity.enid}/edit/`}>
                    <Button variant='primary'>Edit</Button>
                  </Link>
                </>
              ),
            }))}
          />
        ) : (
          <p>{this.getNoResultText()}</p>
        )}
      </Container>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams
