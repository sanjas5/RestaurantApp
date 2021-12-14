var express = require('express');
var router = express.Router();
var conn = require('../connection/connection');
var pg = require('pg');
var pool = new pg.Pool(conn);
var enkripcija = require('../connection/enkripcija');

router.get('/', (req, res) => {
  res.redirect('/adm/detalji');
});

router.get('/detalji', (req, res, next) => {
  res.render('admin/admin_panel', { name: req.userName });
});

router.get('/restorani', (req, res, next) => {
  pool
    .query('select * from restoran where jeLiAktivan is true')
    .then((resp) => {
      res.render('admin/lista_restorana', {
        name: req.userName,
        restorani: resp.rows,
        title: 'Restorani',
      });
    })
    .catch((err) => {
      res.send('Greska');
    });
});

var encrypt = require('../connection/enkripcija');
module.exports = {
    provjera: function (req, res, next) {
        var { id, ime, uloga, email, restoran, restoranId } = JSON.parse(
            req.cookies['user']
        );
        console.log(id, ime, uloga, email, restoran, restoranId);
        if (!id) {
            res.redirect('/users/login');
        } else {
            try {
                req.user_id = encrypt.decrypt(id);
                req.userEmail = email;
                req.userName = ime;
                req.role = uloga;
                req.restoran = restoran;
                req.restoranId = restoranId;
                if (req.originalUrl.includes('/customer') && req.role === 'Kupac') {
                    // da li je kupac
                    return next();
                } else if (
                    req.originalUrl.includes('/delivery') &&
                    req.role === 'Dostavljac'
                ) {
                    return next();
                } else if (req.originalUrl.includes('/adm') && req.role === 'Admin') {
                    return next();
                } else if (
                    req.restoran !== req.params.restoranNaziv &&
                    req.role !== 'Admin Restorana'
                )
                    return res.render('error', {
                        message: 'Nemate potrebnu autoritizaciju.',
                        error: { status: 401 },
                    });
                return next();
            } catch (error) {
                console.log(error);
                res.redirect('/users/login');
            }
        }
    },
    checkAdmin: function (req, res, next) {
        if (req.role !== 'Admin')
            res.render('error', {
                message: 'Nemate potrebnu autoritizaciju.',
                error: { status: 401 },
            });
        else {
            return next();
        }
    },
};


router.post('/restoran', (req, res, next) => {
  pool
    .query(
      'insert into restoran(naziv, telefon, datum_otvaranja,' +
        ' radno_vrijeme_od, radno_vrijeme_do, broj_radnika, broj_zvjezdica)' +
        ' values($1,$2,$3,$4,$5,$6,$7)',
      [
        req.body.naziv,
        req.body.phone,
        req.body.date,
        req.body.time1,
        req.body.time2,
        req.body.radnici,
        req.body.zvijezde,
      ]
    )
    .then((resp) => {
      res.redirect('/adm/restorani');
    })
    .catch((err) => {
      res.send('Greška');
    });
});
router.get('/restoran/:id', (req, res, next) => {
  pool
    .query('select * from restoran where id = $1 and jeLiAktivan = true', [
      req.params.id,
    ])
    .then((resp) => {
      res.render('admin/restoran', {
        restoran: resp.rows[0],
        name: req.userName,
      });
    })
    .catch((err) => {
      res.send('Greska');
    });
});
/*
router.delete('/restoran/:id', (req, res, next) =>{
    pool.query('delete from restoran where id=$1 ', [req.params.id])
    .then(resp => {
        resp.sendStatus(201);
    })

});
*/
//update - arhiviranje restorana
router.put('/restoran/:id', (req, res, next) => {
  pool.query('update restoran set jeLiAktivan=false where id=$1', [
    req.params.id,
  ]);
  res.sendStatus(204);
});

router.post('/adm_restorana', (req, res, next) => {
  console.log(req.body);
  const tip = 2;
  pool
    .query(
      'insert into korisnik(ime,prezime,email,pwd,telefon) values($1,$2,$3,$4,$5) returning id',
      [
        req.body.ime,
        req.body.prezime,
        req.body.email,
        enkripcija.encrypt(req.body.pwd),
        req.body.telefon,
      ]
    )

    .then((resp) => {
      return pool.query(
        'insert into korisnik_uloga_korisnika_restoran(id_korisnika,id_uloga_korisnika,restoran) values($1,$2,$3)',
        [resp.rows[0].id, tip, req.body.id]
      );
    })
    .then((resp) => {
      console.log('TU sam');
      res.redirect('/adm/restorani');
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get('/adm_rest/:id', (req, res, next) => {
  res.render('admin/adm_rest', {
    name: req.userName,
    id: req.params.id,
  });
});

router.get('/tipovi_hrane', (req, res, next) => {
  pool
    .query('select * from tipovi_hrane')
    .then((resp) => {
      res.render('admin/lista_tipovi_hrane', {
        name: req.userName,
        tipovi_hrane: resp.rows,
        title: 'Tipovi hrane',
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post('/tip_hrane', (req, res, next) => {
  pool
    .query('insert into tipovi_hrane(tip) values($1)', [req.body.tip])
    .then((resp) => {
      res.redirect('/adm/tipovi_hrane');
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get('/vrste_restorana', (req, res, next) => {
  pool
    .query('select * from vrste_restorana')
    .then((resp) => {
      res.render('admin/lista_vrste_restorana', {
        name: req.userName,
        vrste_restorana: resp.rows,
        title: 'Vrste restorana',
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post('/vrsta_restorana', (req, res, next) => {
  pool
    .query('insert into vrste_restorana values($1)', [req.body.vrsta])
    .then((resp) => {
      res.redirect('/adm/vrste_restorana');
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get('/gradovi', (req, res, next) => {
  pool
    .query('select * from grad')
    .then((resp) => {
      res.render('admin/lista_gradova', {
        name: req.userName,
        lista_gradova: resp.rows,
        title: 'Gradovi',
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post('/grad', (req, res, next) => {
  pool
    .query('insert into grad(ime) values($1)', [req.body.grad])
    .then((resp) => {
      res.redirect('/adm/gradovi');
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get('/narudzbe', (req, res, next) => {
  pool
    .query('select * from narudzba')
    .then((resp) => {
      res.render('admin/narudzbe', {
        name: req.userName,
        narudzbe: resp.rows,
        title: 'Narudzbe',
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

module.exports = router;
