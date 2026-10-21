use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
struct Configuration {enabled:bool,policy_version:String,product_gids:Vec<String>,#[serde(default)]require_reviews:bool}

#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
struct Approvals {version:String,customer_gid:String,reviews:Vec<Approval>}
#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
struct Approval {review_id:String,review_hash:String,product_gid:String,variant_gid:String,quantity:i32}

#[shopify_function]
fn cart_validations_generate_run(input: schema::cart_validations_generate_run::Input) -> Result<schema::CartValidationsGenerateRunResult> {
 let configuration=input.validation().configuration().and_then(|field| serde_json::from_str::<Configuration>(field.value()).ok());
 let Some(configuration)=configuration else {return Ok(schema::CartValidationsGenerateRunResult {operations:vec![]});};
 if !configuration.enabled || configuration.policy_version!="bundle-signin-20261020" || configuration.product_gids.is_empty() || configuration.product_gids.len()>100 || configuration.product_gids.iter().any(|id| !id.starts_with("gid://shopify/Product/") || id.trim_start_matches("gid://shopify/Product/").is_empty() || !id.trim_start_matches("gid://shopify/Product/").chars().all(|c| c.is_ascii_digit())) {return Ok(schema::CartValidationsGenerateRunResult {operations:vec![]});}
 let authenticated=input.cart().buyer_identity().map(|identity| *identity.is_authenticated()).unwrap_or(false);
 let customer=input.cart().buyer_identity().and_then(|identity| identity.customer());
 let approvals=customer.and_then(|c|c.approvals()).filter(|f| f.value().len()<=32768).and_then(|f|serde_json::from_str::<Approvals>(f.value()).ok()).filter(|a|a.version=="bundle-review-approval-v1"&&a.reviews.len()<=100&&customer.map(|c|c.id()==&a.customer_gid).unwrap_or(false));
 let mut has_bundle=false;
 let mut invalid_review=false;
 let mut used_reviews=std::collections::HashSet::new();
 for line in input.cart().lines().iter() {
  let schema::cart_validations_generate_run::input::cart::lines::Merchandise::ProductVariant(variant)=line.merchandise() else {continue;};
  let product=variant.product();
  let stream=product.stream().map(|field| field.value().as_str()).unwrap_or("");
  let override_contents=variant.contents().map(|field| field.value().as_str()).unwrap_or("");
  let override_blank=override_contents.chars().filter(|c| !c.is_whitespace()).collect::<String>();
  let contents=if override_blank.is_empty() || override_blank=="[]" {product.contents().map(|field| field.value().as_str()).unwrap_or("")}else{override_contents};
  let contents=contents.chars().filter(|c| !c.is_whitespace()).collect::<String>();
  let listed=configuration.product_gids.iter().any(|id| id==product.id());
  let valid_bundle=!product.is_gift_card() && stream=="ready_series" && !contents.is_empty() && contents!="[]";
  if listed&&configuration.require_reviews&&!valid_bundle {has_bundle=true;invalid_review=true;continue;}
  let scoped_bundle=listed&&valid_bundle;
  if !scoped_bundle {continue;}
  has_bundle=true;
  if !configuration.require_reviews {continue;}
  let id=line.review_id().and_then(|f|f.value()).map(|s|s.as_str()).unwrap_or("");
  let hash=line.review_hash().and_then(|f|f.value()).map(|s|s.as_str()).unwrap_or("");
  let matching=approvals.as_ref().map(|a|a.reviews.iter().filter(|r|r.review_id==id&&r.review_hash==hash&&&r.product_gid==product.id()&&&r.variant_gid==variant.id()&&r.quantity==*line.quantity()).count()==1).unwrap_or(false);
  if id.is_empty()||id.len()>100||hash.len()!=64||!hash.bytes().all(|c|c.is_ascii_digit()||(b'a'..=b'f').contains(&c))||*line.quantity()<1||!matching||!used_reviews.insert(id.to_owned()) {invalid_review=true;}
 }
 let errors=if has_bundle && !authenticated {vec![schema::ValidationError {message:"Sign in to purchase Ready Series bundles.".to_owned(),target:"$.cart".to_owned()}]} else if configuration.require_reviews&&invalid_review {vec![schema::ValidationError {message:"Return to your cart and review this bundle before checkout.".to_owned(),target:"$.cart".to_owned()}]} else {vec![]};
 Ok(schema::CartValidationsGenerateRunResult {operations:if errors.is_empty(){vec![]}else{vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation {errors})]}})
}
