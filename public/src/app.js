const Sequelize = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();

const sequelize = new Sequelize(process.env.POSTGRES_DB, process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamp: false
	}
});

// TABLES
const User = sequelize.define('users', {
	username: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING,
});

const Post = sequelize.define('posts', {
	title: Sequelize.STRING,
	body: Sequelize.STRING,
});

const Comment = sequelize.define('comments', {
	body: Sequelize.STRING,
})

Post.belongsTo(User, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
User.hasMany(Post, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })

// post-comment rel
Comment.belongsTo(Post, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
Post.hasMany(Comment, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })

// USE
app.use(session({
	secret: 'secret blog app lol',
	resave: false,
	saveUninitialized: false
}))
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static('./public'));

// SET
app.set('views', './public/views/pages');
app.set('view engine', 'ejs');

// ******* ROUTES **********
// =========================
// ROOT
app.get('/', (req, res) => {
	res.render(`index`, {
		message: req.query.message,
		user: req.session.user
	});
});

// PROFILE
app.get('/profile', (req, res) => {
	const user = req.session.user;
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile"));
	} else {
		res.render('profile', {
			user: user
		});
	}
})

// USERS LIST
app.get('/list', (req, res) => { 
	Post.findAll().then( post => {
		res.render('list', {post:post});	
	})
})

// PERSONAL LIST 
app.get('/plist', (req, res) => {
	Post.findAll({
		where: {
			userId: req.session.user.id 
		}
	})
	.then( userPost => {
		res.render('plist', {userPost:userPost});
	})
})

// USER POSTS LIST
app.get('/list/:id', (req, res) => {
	const param = req.params.id;
	Post.findAll({
		include: [{model: Comment}],
		where: {
			id: param
		}
	})
	.then( post => {
		console.log(post);
		res.render('singlePost', {post:post})
	})
})

// SIGN UP
app.post('/signup', (req, res) => {
  User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password
  })
  .then((user) => {
  	req.session.user = user;
  	res.redirect('/profile');
  })

  User.beforeCreate(function(user, options) {
    return cryptPassword(user.password)
      .then(success => {
        user.password = success;
        console.log('password encrypted')
      })
      .catch(err => {
        if (err) console.log(err);
      });
  });

	function cryptPassword(password) {
	  console.log("cryptPassword" + password);
	  return new Promise((resolve, reject) => {
	    bcrypt.genSalt(10, (err, salt) => {
	      // Encrypt password using bycrpt module
	      if (err) return reject(err);

	      bcrypt.hash(password, salt,(err, hash) => {
	        if (err) return reject(err);
	        return resolve(hash);
	      });
	    });
	  });
	}

})

// USER POST
app.post('/posts', (req,res) => {
	Post.create({
		title: req.body.title,
		body: req.body.body,
		userId: req.session.user.id,
	}).then(() => {
		res.redirect('/list');
	})
})

// COMMENTS
app.post('/comment', (req,res) => {
	Post.findOne({
		where: {
			userId: req.session.user.id 
		}
	})
	.then( post => {
		Comment.create({
			body: req.body.body,
			postId: post.id,
		})
	})
	.then(() => {
		res.redirect('/list');
	})
})

// LOGIN 
app.post('/login', (req, res) => {
	if (req.body.email.length === 0) {
		res.redirect('/?message=' + encodeURIComponent('Please fill out your email address!')); 
		return;
	}
	if (req.body.password.length === 0) {
		res.redirect('/?message=' + encodeURIComponent('Please fill out your password!')); 
		return;
	}
	let email = req.body.email;
	let password = req.body.password;

	User.findOne({
		where: {
			email: email
		}
	})
	.then((user) => {
		if(user !== null ) {
			let hash = user.password;
			bcrypt.compare(password, hash,(err, result) => {
		    console.log('success');
		    req.session.user = user;
				res.redirect('/profile');
			});
		} else {
			res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}	
	})
	.catch((error) => {
		console.error(error);
	});
});

// LOGOUT
app.get('/logout', (req,res) => {
	req.session.destroy((error) => {
		if(error){
			throw error;
		}
		res.redirect('/?message=' + encodeURIComponent("Hope to see you soon."));
	})
});

// DELETE POST
app.delete('/postDel/:id', (req,res) => {
	let del_id = req.params.id;
	Post.destroy({
		where: {
			id: del_id
		}
	});
	res.send('deleted');
});

sequelize.sync()
.then(() => {
	const server = app.listen(3000, () => {
		console.log('server listening on port 3000');
	});
});
