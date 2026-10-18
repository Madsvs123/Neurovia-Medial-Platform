const educatorMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'educator' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ 
      message: 'Not authorized as educator or admin'
    });
  }
};

module.exports = educatorMiddleware;