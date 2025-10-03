from flask import Flask ,request,render_template,redirect,session,flash
from flask_sqlalchemy import SQLAlchemy
import bcrypt

app = Flask(__name__)
app.secret_key = 'secret_key'

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///datausers.db'
db = SQLAlchemy(app)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    tasks = db.relationship('Task', backref='user', lazy=True)
    def __init__(self, name, email, password):
        self.name = name
        self.email = email
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

with app.app_context():
    db.create_all()

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/register", methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        new_user = User(name=name, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()
        return redirect('/login')
    return render_template('register.html')

@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            session['email'] = user.email
            return redirect('/dashboard')
        else:
            return render_template('login.html', error='Invalid user credentials')

    return render_template('login.html')


@app.route("/dashboard" , methods=['POST','GET'])
def dashboard():
    if 'email' not in session:
        return redirect('/login')

    user = User.query.filter_by(email=session['email']).first()

    # Add new task
    if request.method == 'POST':
        title = request.form['title']
        new_task = Task(title=title, user_id=user.id)
        db.session.add(new_task)
        db.session.commit()
        flash(f'Task Added Successfully', 'success')
        return redirect('/dashboard')

    # Get tasks and check if an edit is requested
    tasks = Task.query.filter_by(user_id=user.id).all()
    edit_id = request.args.get('edit', type=int)

    return render_template('dashboard.html', name=user.name, tasks=tasks, edit_id=edit_id)

@app.route('/delete/<int:task_id>')
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    if 'email' not in session or task.user.email != session['email']:
        return redirect('/login')
    db.session.delete(task)
    db.session.commit()
    return redirect('/dashboard')

@app.route('/update/<int:task_id>', methods=['POST'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    if 'email' not in session or task.user.email != session['email']:
        return redirect('/login')

    task.title = request.form['title']
    db.session.commit()
    return redirect('/dashboard')




@app.route('/logout')
def logout():
    session.pop('email',None)
    return redirect('/login')

if __name__ == "__main__":
    app.run()



