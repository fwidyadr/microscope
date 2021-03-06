Posts = new Mongo.Collection('posts');

Posts.allow({
	update: function(userId, post) { return ownsDocument(userId, post); }, 
	remove: function(userId, post) { return ownsDocument(userId, post); }
});

Posts.deny({
	update: function(userId, post, fieldNames){
		return (_.without(fieldNames, 'url', 'title').length > 0);
	}
});

Posts.deny({
	update: function(usedId, post, fieldNames, modifier){
		var errors = validatePost(modifier.$set);
		return errors.url || errors.title;
	}
});

validatePost = function(post){
	var errors = {};
	if(!post.title)
		errors.title = "Please fill in a headline";
	if(!post.url)
		errors.url = "Please fill in a url";

	return errors;
}

Meteor.methods({
	postInsert: function(postAttributes) {
		check(this.userId, String);
		check(this.userId, String); check(postAttributes, {
	      title: String,
	      url: String
	    });

	    var errors = validatePost(postAttributes);

    	if(errors.title || errors.url)
    		throw new Meteor.Error('invalid-post', "You must set a title and URL for your post");

		var postWithSameLink = Posts.findOne({url: postAttributes.url}); 

		if (postWithSameLink) {
			return {
				postExists: true,
				_id: postWithSameLink._id
			} 
		}

		var user = Meteor.user();
		var post = _.extend(postAttributes, {
			userId: user._id, 
			author: user.username, 
			submitted: new Date(),
			commentsCount: 0,
			upvoters: [],
	    	votes: 0
		});

		var postId = Posts.insert(post);
		
		return {
			_id: postId
		}; 
	},

	postUpdate: function(postAttributes) {
		check(postAttributes, {
		  _id: String,
	      title: String,
	      url: String
	    });

	    if(Meteor.isServer){
	    	postAttributes.title += "(server)";
	    	Meteor._sleepForMs(5000);    	 
	    }else{
	    	postAttributes.title += "(client)";
	    }
		
		var postWithSameLink = Posts.findOne({url: postAttributes.url}); if (postWithSameLink) {
			return {
				postExists: true,
				_id: postWithSameLink._id
			} 
		}

		var user = Meteor.user();
		var post = _.extend(postAttributes, {
			userId: user._id, 
			author: user.username, 
			submitted: new Date()
		});

		var numberOfChanges = Posts.update(postAttributes._id, post);
		
		return {
			_id: postAttributes._id
		}; 
	},

	upvote: function(postId){
		check(this.userId, String);
		check(postId, String);

		var affected = Posts.update({
			_id: postId,
			upvoters: {$ne: this.userId}
		},{
			$addToSet: {upvoters: this.userId},
			$inc: {votes: 1}
		});

		if(!affected)
			throw new Meteor.Error('invalid', "You were not able to upvote this post!");
	} 
});