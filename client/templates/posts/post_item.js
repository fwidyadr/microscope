Template.postItem.helpers({
	ownPost: function(){
		return this.usedId === Meteor.userId();
	},

	domain: function(){
		var a = document.createElement('a');
		a.href = this.url;
		return a.hostname;
	},

	commentsCount: function(){
		return Comments.find({postId: this._id}).count();
	}
});