import { success, notFound } from '../../services/response/'
import { User } from '.'
import { Flight } from '../flight'

export const index = ({ querymen: { query, select, cursor } }, res, next) =>
  User.find(query, select, cursor)
  .populate("flights", "-__v")
    .then((users) => users.map((user) => user.view(true)))
    .then(success(res))
    .catch(next)

export const show = ({ params }, res, next) =>
  User.findById(params.id)
  .populate("flights", "-__v")
    .then(notFound(res))
    .then((user) => user ? user.view(true) : null)
    .then(success(res))
    .catch(next)

export const showMe = ({ user }, res) =>
  res.json(user.view(true))

export const create = ({ bodymen: { body } }, res, next) =>
  User.create(body)
    .then((user) => user.view(true))
    .then(success(res, 201))
    .catch((err) => {
      /* istanbul ignore else */
      if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
          valid: false,
          param: 'email',
          message: 'email already registered'
        })
      } else {
        next(err)
      }
    })

export const update = ({ bodymen: { body }, params, user }, res, next) =>
  User.findById(params.id === 'me' ? user.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      // const isAdmin = user.role === 'admin'
      // const isSelfUpdate = user.id === result.id
      // if (!isSelfUpdate && !isAdmin) {
      //   res.status(401).json({
      //     valid: false,
      //     message: 'You can\'t change other user\'s data'
      //   })
      //   return null
      // }
      return result
    })
    .then((user) => user ? Object.assign(user, body).save() : null)
    .then((user) => user ? user.view(true) : null)
    .then((user) => {
      if (!user || !user.flights) return null
      user.flights.forEach(async flight => {
        // if(flight.passengers){
        //   flight.passengers.forEach(async passenger => {
        //   console.log("passenger.id", passenger.id )
        //   console.log("params.id", params.id )
        //     if(passenger.id === params.id) return
        //   })
        // }
        await Flight.findByIdAndUpdate(
          { _id: flight },
          { $push: { passengers: params.id }},
          { new: true, useFindAndModify: false }
        );
      })
      return user
    })
    .then(success(res))
    .catch(next)

export const updatePassword = ({ bodymen: { body }, params, user }, res, next) =>
  User.findById(params.id === 'me' ? user.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isSelfUpdate = user.id === result.id
      if (!isSelfUpdate) {
        res.status(401).json({
          valid: false,
          param: 'password',
          message: 'You can\'t change other user\'s password'
        })
        return null
      }
      return result
    })
    .then((user) => user ? user.set({ password: body.password }).save() : null)
    .then((user) => user ? user.view(true) : null)
    .then(success(res))
    .catch(next)

export const destroy = ({ params }, res, next) =>
  User.findById(params.id)
    .then(notFound(res))
    .then((user) => user ? user.remove() : null)
    .then(success(res, 204))
    .catch(next)
