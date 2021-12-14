var encrypt = require('../connection/enkripcija');
module.exports = {
  provjera: function (req, res, next) {
    var { id, ime, uloga, email, restoran, restoranId } = JSON.parse(
      req.cookies['user']
    );
    console.log('User Request: ', ime, uloga, email, restoran);
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
        if (req.originalUrl.includes('/adm_rest/detalji')) {
          if (req.role === 'Admin restorana')
            res.redirect(`/adm_rest/${restoran}/detalji`);
          else {
            return res.render('error', {
              message: 'Nemate potrebnu autoritizaciju.',
              error: { status: 401 },
            });
          }
        }
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
          req.role !== 'Admin restorana'
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
