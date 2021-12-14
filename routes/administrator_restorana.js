var express = require('express');
var router = express.Router();
var conn = require('../connection/connection');
var pg = require('pg');
var pool = new pg.Pool(conn);
var enkripcija = require('../connection/enkripcija');

router.get('/', (req, res) => {
    res.redirect(`/adm_rest/${req.restoran}/detalji`);
});

// router.get('/:id/detalji', (req, res) => {
//     res.render('admin_restorana/o_restoranu', {
//         id: req.params.id,
//     });
// });

router.get('/detalji', (req, res) => {
    res.render('admin_restorana/admin_rest_panel', {
        name: req.userName,
        nazivRestorana: req.restoran,
    });
});

router.get('/restoran_about', (req, res) => {
    pool
        .query('select * from restoran where naziv = $1', [req.restoran])
        .then((resp) => {
            res.render('admin_restorana/o_restoranu', {
                restoran: resp.rows,
                nazivRestorana: req.restoran,
                name: req.userName,
            });
        })
        .catch((error) => {
            console.log(error);
        });
});

router.post('/restoran', (req, res, next) => {
    pool
        .query(
            'update restoran set telefon=$1, kapacitet=$2, broj_zvjezdica=$3, jeliaktivan=$4 where naziv = $5',
            [
                req.body.telefon,
                req.body.kapacitet || 0,
                req.body.broj_zvjezdica,
                req.body.jeliaktivan,
                req.restoran,
            ]
        )
        .then((resp) => {
            res.redirect('back');
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.get('/artikli', (req, res, next) => {
    pool
        .query(
            'select * from artikal LEFT JOIN tipovi_hrane th ON th.id = tip_artikla'
        )
        .then((resp) => {
            pool.query('Select * from tipovi_hrane').then((foodTypes) => {
                res.render('admin_restorana/artikli', {
                    artikli: resp.rows,
                    nazivRestorana: req.restoran,
                    name: req.userName,
                    tipovi: foodTypes.rows,
                });
            });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.post('/artikal', (req, res) => {
    pool
        .query(
            'insert into artikal(ime,cijena,slika,kolicina,tip_artikla) values($1,$2,$3,$4,$5) returning id;',
            [
                req.body.ime,
                req.body.cijena,
                req.body.slika,
                req.body.kolicina,
                req.body.tip,
            ]
        )
        .then((resp) => {
            req.noviArtikalId = resp.rows[0].id;
            pool.query(
                'insert into meni(restoran_id) values($1) ON CONFLICT DO NOTHING;',
                [req.restoranId]
            );
        })
        .then(() => {
            pool
                .query('select id from meni where restoran_id = $1;', [req.restoranId])
                .then((resp2) => {
                    console.log('ovdje', resp2.rows);
                    pool.query(
                        'insert into meni_artikal(meni_id, artikal_id) values($1, $2)',
                        [resp2.rows[0].id, req.noviArtikalId]
                    );
                });
        })
        .then(() => {
            console.log('Artikal dodan');
            res.status(200).json({ msg: 'Artikal dodan' });
        })
        .catch((err) => {
            console.log(err);
            return res.render('error');
        });
});

router.get('/dostavljaci', (req, res, next) => {
    pool
        .query(
            `SELECT ime, prezime, email, ko.telefon, adresa, restoran.id, ulica, grad from korisnik ko 
    join korisnik_uloga_korisnika_restoran kukr on kukr.id_korisnika = ko.id
    join lokacija lok on ko.adresa = lok.id
    left join restoran on restoran.administrator_restorana_id = ko.id
    where kukr.restoran = 1 and restoran.id is null;`
        )
        .then((resp) => {
            res.render('admin_restorana/dostavljaci', {
                dostavljaci: resp.rows,
                nazivRestorana: req.restoran,
                restoranId: req.restoranId,
                name: req.userName,
            });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.post('/dostavljac/:id', (req, res, next) => {
    pool
        .query('update narudzba set dostavljac_id = $1 where id = $2', [
            req.params.id,
            req.body.narudzba,
        ])
        .then((resp) => {
            res.status(200).send({ msg: 'Dostavljac dodan.' });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.post('/dostavljac', (req, res) => {
    const adresa = JSON.parse(req.body.adresa);
    pool.query(
        'insert into lokacija(latituda, longituda, ulica, grad) values ($1,$2,$3,$4) returning id',
        [
            adresa.latitude,
            adresa.longitude,
            adresa.formattedAddress,
            adresa.addressComponents.city,
        ],
        (err, resp) => {
            if (err) {
                console.error(err);
                return res.render('error');
            }
            pool.query(
                'insert into korisnik(ime,prezime,email,pwd,telefon,adresa) values ($1,$2,$3,$4,$5,$6) returning id',
                [
                    req.body.firstname,
                    req.body.surname,
                    req.body.email,
                    enkripcija.encrypt(req.body.pwd),
                    req.body.telefon,
                    resp.rows[0].id,
                ],
                (err, resp) => {
                    if (err) {
                        console.error(err);
                        return res.render('error');
                    }
                    pool.query(
                        'insert into korisnik_uloga_korisnika_restoran(id_korisnika,id_uloga_korisnika,restoran) values ($1,$2,$3)',
                        [resp.rows[0].id, 3, req.body.restoranId],
                        (err, resp) => {
                            if (err) {
                                console.error(err);
                                return res.render('error');
                            }
                            res.status(200).json({ msg: 'Dobavljač dodan' });
                        }
                    );
                }
            );
        }
    );
});

router.get('/narudzbe', (req, res) => {
    pool
        .query(
            `select
      na.id "id", jeliisporuceno, CONCAT(k1. ime || ' ' || k1.prezime) "imeKupac",
      CONCAT(k2. ime || ' ' || k2.prezime) "imeDostavljac",
      racun.cijena, racun.vrijeme, racun.datum, lo.latituda, lo.longituda
      from narudzba na 
      join racun on racun.id = na.racun_id 
      join korisnik k1 on k1.id = na.kupac_id 
      left join korisnik k2 on k2.id = dostavljac_id
      left join lokacija lo on k1.adresa = lo.id
	  where na.restoran_id = $1 ORDER BY racun.datum DESC, racun.vrijeme DESC`,
            [req.restoranId]
        )
        .then((resp) => {
            pool
                .query(
                    `
      select concat(ime || ' ' || prezime) "ime", korisnik.id 
      from korisnik_uloga_korisnika_restoran join korisnik on korisnik.id = id_korisnika
      where id_uloga_korisnika = 3 and restoran = $1`,
                    [req.restoranId]
                )
                .then((response) => {
                    res.render('admin_restorana/narudzbe', {
                        narudzbe: resp.rows,
                        dostavljaci: response.rows,
                        nazivRestorana: req.restoran,
                        restoranId: req.restoranId,
                        name: req.userName,
                    });
                });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.get('/grupni_meni', (req, res) => {
    pool
        .query(
            `select ar.ime "artikalIme", ar.slika "artikalSlika", ar.cijena "artikalCijena", ar.kolicina "artikalKolicina", th.tip "artikalTip",
      ar.id "artikalId",
      meni.naziv "meniNaziv"
      from meni
      left join meni_artikal ma on ma.meni_id = meni.id 
      join artikal ar on ar.id = artikal_id 
      LEFT JOIN tipovi_hrane th ON th.id = ar.tip_artikla
      where restoran_id = $1;`,
            [req.restoranId]
        )
        .then((resp) => {
            pool
                .query('SELECT * FROM meni WHERE restoran_id = $1', [req.restoranId])
                .then((restoranMeni) => {
                    res.render('admin_restorana/grupni_meni', {
                        artikli: resp.rows,
                        nazivRestorana: req.restoran,
                        restoranId: req.restoranId,
                        name: req.userName,
                        meni: restoranMeni.rows,
                    });
                });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.post('/meni', (req, res, next) => {
    console.log('ovooo', req.body);
    pool
        .query('insert into meni(restoran_id, naziv) values($1,$2) returning id', [
            req.body.restoranId,
            req.body.naziv,
        ])
        .then((resp) => {
            res.redirect('back');
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

router.put('/meni', (req, res) => {
    pool
        .query('update meni_artikal SET meni_id = $1 WHERE artikal_id = $2', [
            req.body.meni,
            req.body.artikal,
        ])
        .then((resp) => {
            res.status(200).json({ msg: 'Artikal dodan u novi meni' });
        })
        .catch((error) => {
            console.log(error);
            return res.render('error');
        });
});

module.exports = router;
