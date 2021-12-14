var express = require('express');
var router = express.Router();
var conn = require('../connection/connection');
var pg = require('pg');
var pool = new pg.Pool(conn);

router.get('/', (req, res, next) => {
  pool
    .query(
      `SELECT na.kupac_id "kupac" ,racun.id "racun", na.id, racun.datum, aa.ime, aa.slika, na.jeliisporuceno, vrijeme, 
        racun.cijena, artikal_id, broj FROM narudzba 
      inner join racun on racun.id = racun_id 
      inner join artikalracun ar on ar.racun_id = racun.id
      inner join artikal aa on aa.id = artikal_id
      inner join narudzba na on na.racun_id = racun.id
      where na.dostavljac_id = $1`,
      [req.user_id]
    )
    .then((resp) => {
      res.render('delivery/narudzbe', {
        aktivne: resp.rows,
        name: req.userName,
      });
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

router.post('/prihvati_dostavu', (req, res) => {
  console.log(req.body);
  pool
    .query(
      'update narudzba set jeliisporuceno = not jeliisporuceno where id = $1',
      [req.body.id]
    )
    .then((resp) => {
      res.status(200).send({ msg: 'Dostava u toku.' });
    })
    .catch((error) => {
      console.log(error);
      //next(error);
    });
});

module.exports = router;
