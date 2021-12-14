var express = require('express');
var nodemailer = require('nodemailer');
var router = express.Router();
var conn = require('../connection/connection');
var pg = require('pg');
var pool = new pg.Pool(conn);

router.get('/', (req, res, next) => {
  // iz okoline naci
  pool
    .query('select * from restoran')
    .then((resp) => {
      res.render('kupac/biraj_restoran', {
        restorani: resp.rows,
        name: req.userName,
      });
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

router.get('/korpa', (req, res, next) => {
  res.render('kupac/korpa', {
    name: req.userName,
  });
});

Date.prototype.addHours = function (h) {
  this.setHours(this.getHours() + h);
  return this;
};

router.post('/korpa', (req, response, next) => {
  const data = JSON.parse(Object.keys(req.body)[0]);
  let racunInsert = `'INSERT INTO racun(id, datum, vrijeme, cijena) VALUES($1, CURRENT_TIMESTAMP, NOW(), $2) RETURNING id'`;
  if (data.brzinaDostave == 2)
    racunInsert = `INSERT INTO racun(id, datum, vrijeme, cijena) VALUES($1, CURRENT_TIMESTAMP, now() + interval '1 hours', $2) RETURNING id`;
  else if (data.brzinaDostave == 3)
    racunInsert = `INSERT INTO racun(id, datum, vrijeme, cijena) VALUES($1, CURRENT_TIMESTAMP, now() + interval '2 hours', $2) RETURNING id`;

  pool.connect((err, client, done) => {
    const shouldAbort = (err) => {
      if (err) {
        console.error('Error in transaction', err.stack);
        client.query('ROLLBACK', (err) => {
          if (err) {
            console.error('Error rolling back client', err.stack);
          }
          // release the client back to the pool
          done();
          response.status(500).send('Database error');
        });
      }
      return !!err;
    };

    client.query('BEGIN', (err) => {
      if (shouldAbort(err)) return;
      client.query(
        racunInsert,
        [Math.floor(new Date().getTime() / 1000000), data.cijena],
        (err, res) => {
          if (shouldAbort(err)) return;
          const insertArtikli =
            'INSERT INTO artikalracun(racun_id, artikal_id, broj) VALUES ($1, $2, $3)';
          for (let i = 0; i < data.artikli.length; i++) {
            client.query(
              insertArtikli,
              [res.rows[0].id, data.artikli[i].id, data.artikli[i].count],
              (err, res) => {
                if (shouldAbort(err)) return;
              }
            );
          }
          client.query(
            'INSERT INTO narudzba(racun_id, kupac_id, restoran_id) VALUES ($1,$2,$3)',
            [res.rows[0].id, req.user_id, data.artikli[0].restoranId],
            (err, res) => {
              if (shouldAbort(err)) return;
              client.query('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction', err.stack);
                }
                done();
                console.log('Racun dodan');

                // Napraviti email i dodati
                // Allow less secure apps to access account Upaliti i ugasiti 2 faktor autoritizaciju
                var transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: 'mojemail@gmail.com',
                    pass: 'password',
                  },
                });

                var mailOptions = {
                  from: 'mojemail@gmail.com',
                  to: req.userEmail,
                  subject: 'Vaša naruđžba je uspješno spašena',
                  text: 'Očekujte brzu dostavu',
                };

                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Email sent: ' + info.response);
                  }
                });

                response.status(200).send({ message: 'success' });
              });
            }
          );
        }
      );
    });
  });
});

router.get('/trenutno', (req, res, next) => {
  pool
    .query(
      `
  SELECT na.kupac_id "kupac" ,racun.id, racun.datum, aa.ime, aa.slika, na.jeliisporuceno, vrijeme, racun.cijena, artikal_id, broj FROM narudzba 
  inner join racun on racun.id = racun_id 
  inner join artikalracun ar on ar.racun_id = racun.id
  inner join artikal aa on aa.id = artikal_id
  inner join narudzba na on na.racun_id = racun.id 
  where na.kupac_id = $1
  order by racun.id, racun.datum DESC;
    `,
      [req.user_id]
    )
    .then((resp) => {
      res.render('kupac/trenutne', { name: req.userName, narudzbe: resp.rows });
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

router.get('/:id', (req, res, next) => {
  pool
    .query('select * from restoran where id = $1', [req.params.id])
    .then((result) => {
      req.restoranInfo = result;
      pool
        .query(
          `select ar.id, ar.ime, cijena, slika, ar.kolicina, th.tip "tipArtikla"  from meni_artikal 
      join meni on meni.id = meni_id 
      join artikal ar on ar.id = artikal_id
      left join tipovi_hrane th on ar.tip_artikla = th.id
      join restoran on restoran.id = restoran_id where restoran.id = $1`,
          [req.params.id]
        )
        .then((resp) => {
          res.render('kupac/restoran', {
            restoran: req.restoranInfo.rows,
            artikli: resp.rows,
            name: req.userName,
            nazivRestorana: req.restoranInfo.rows[0].naziv,
          });
        });
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

module.exports = router;
