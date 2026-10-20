use super::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
struct Configuration {enabled:bool,policy_version:String,product_gids:Vec<String>}

#[shopify_function]
fn cart_validations_generate_run(input: schema::cart_validations_generate_run::Input) -> Result<schema::CartValidationsGenerateRunResult> {
 let configuration=input.validation().configuration().and_then(|field| serde_json::from_str::<Configuration>(field.value()).ok());
 let Some(configuration)=configuration else {return Ok(schema::CartValidationsGenerateRunResult {operations:vec![]});};
 if !configuration.enabled || configuration.policy_version!="bundle-signin-20261020" || configuration.product_gids.is_empty() || configuration.product_gids.len()>100 || configuration.product_gids.iter().any(|id| !id.starts_with("gid://shopify/Product/") || id.trim_start_matches("gid://shopify/Product/").is_empty() || !id.trim_start_matches("gid://shopify/Product/").chars().all(|c| c.is_ascii_digit())) {return Ok(schema::CartValidationsGenerateRunResult {operations:vec![]});}
 let authenticated=input.cart().buyer_identity().map(|identity| *identity.is_authenticated()).unwrap_or(false);
 let has_bundle=input.cart().lines().iter().any(|line| {
  let schema::cart_validations_generate_run::input::cart::lines::Merchandise::ProductVariant(variant)=line.merchandise() else {return false;};
  let product=variant.product();
  let stream=product.stream().map(|field| field.value().as_str()).unwrap_or("");
  let override_contents=variant.contents().map(|field| field.value().as_str()).unwrap_or("");
  let override_blank=override_contents.chars().filter(|c| !c.is_whitespace()).collect::<String>();
  let contents=if override_blank.is_empty() || override_blank=="[]" {product.contents().map(|field| field.value().as_str()).unwrap_or("")}else{override_contents};
  let contents=contents.chars().filter(|c| !c.is_whitespace()).collect::<String>();
  configuration.product_gids.iter().any(|id| id==product.id()) && !product.is_gift_card() && stream=="ready_series" && !contents.is_empty() && contents!="[]"
 });
 let errors=if has_bundle && !authenticated {vec![schema::ValidationError {message:"Sign in to purchase Ready Series bundles.".to_owned(),target:"$.cart".to_owned()}]} else {vec![]};
 Ok(schema::CartValidationsGenerateRunResult {operations:if errors.is_empty(){vec![]}else{vec![schema::Operation::ValidationAdd(schema::ValidationAddOperation {errors})]}})
}
