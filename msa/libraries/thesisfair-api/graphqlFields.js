export default {
	"StudentVote": [
		"uid",
		"pid"
	],
	"Vote": [
		"enid",
		"pid"
	],
	"EventVote": [
		"uid",
		"evid",
		"votes.enid",
		"votes.pid"
	],
	"VoteImportResult": [
		"error"
	],
	"UserBase": [
		"uid",
		"firstname",
		"lastname",
		"email",
		"phone"
	],
	"Student": [
		"UserBase:uid",
		"UserBase:firstname",
		"UserBase:lastname",
		"UserBase:email",
		"UserBase:phone",
		"studentnumber",
		"websites",
		"studies",
		"share",
		"manuallyShared"
	],
	"Representative": [
		"UserBase:uid",
		"UserBase:firstname",
		"UserBase:lastname",
		"UserBase:email",
		"UserBase:phone",
		"enid",
		"repAdmin"
	],
	"Admin": [
		"UserBase:uid",
		"UserBase:firstname",
		"UserBase:lastname",
		"UserBase:email",
		"UserBase:phone"
	],
	"User": [
		"UserBase:uid",
		"UserBase:firstname",
		"UserBase:lastname",
		"UserBase:email",
		"UserBase:phone",
		"Student:studentnumber",
		"Student:websites",
		"Student:studies",
		"Student:share",
		"Student:manuallyShared",
		"Representative:enid",
		"Representative:repAdmin"
	],
	"Schedule": [
		"sid",
		"uid",
		"enid",
		"slot"
	],
	"Project": [
		"pid",
		"enid",
		"evids",
		"name",
		"description",
		"datanoseLink",
		"external_id"
	],
	"ProjectImportResult": [
		"project.pid",
		"project.enid",
		"project.evids",
		"project.name",
		"project.description",
		"project.datanoseLink",
		"project.external_id",
		"error"
	],
	"Event": [
		"evid",
		"enabled",
		"name",
		"description",
		"start",
		"location",
		"studentSubmitDeadline",
		"entities",
		"external_id"
	],
	"EventImportResult": [
		"event.evid",
		"event.enabled",
		"event.name",
		"event.description",
		"event.start",
		"event.location",
		"event.studentSubmitDeadline",
		"event.entities",
		"event.external_id",
		"error"
	],
	"EntityContactInfo": [
		"type",
		"content"
	],
	"Entity": [
		"enid",
		"name",
		"description",
		"type",
		"contact.type",
		"contact.content",
		"external_id",
		"representatives",
		"location"
	],
	"EntityImportResult": [
		"entity.enid",
		"entity.name",
		"entity.description",
		"entity.type",
		"entity.contact.type",
		"entity.contact.content",
		"entity.external_id",
		"entity.representatives",
		"entity.location",
		"error"
	]
}
