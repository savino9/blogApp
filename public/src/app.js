const Sequelize = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');

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
Post.hasMany(Comment, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
Comment.belongsTo(User, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })

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

// 2. PROFILE
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

// 3. USER POSTS LIST
app.get('/posts/:id', (req, res) => {
	const param = req.params.id;
	console.log(param);

	Post.findById(param)
	.then((post)=>{
		res.render('singlePost', {post:post})
	})
})

// LIST
app.get('/list', (req, res) => {
	Post.findAll().then( post => {
		res.render('list', {post:post});
	})
})

app.get('/plist', (req, res) => {
	console.log(req.session.user);

	Post.findAll({
		where: {
			userId: req.session.user.id 
		}
	})
	.then( userPost => {
		res.render('plist', {userPost:userPost});
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
		if(user !== null && password === user.password) {
			req.session.user = user;
			res.redirect('/profile');
		} else {
			res.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	})
	.catch((error) => {
		console.error(error);
	});
});

// LOGOUT
app.get('/logout', (req, res) => {
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
