# AWS architecture icons

These ten SVGs are unmodified assets from the **30 April 2026** [AWS architecture icon package](https://aws.amazon.com/architecture/icons/), downloaded on 10 November 2026. Only filenames have been shortened. AWS permits these assets to be used in architecture diagrams; ownership remains with AWS.

Source archive: [Icon-package_04302026.zip](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_04302026.4705b90f5aa45b019271a2699e9ce9b97b941ee1.zip), under `Architecture-Service-Icons_04302026/Arch_*/48/`.

| Local file | Original asset |
|---|---|
| `cloudfront.svg` | `Arch_Amazon-CloudFront_48.svg` |
| `cloudwatch.svg` | `Arch_Amazon-CloudWatch_48.svg` |
| `ebs.svg` | `Arch_Amazon-Elastic-Block-Store_48.svg` |
| `ecr.svg` | `Arch_Amazon-Elastic-Container-Registry_48.svg` |
| `ecs.svg` | `Arch_Amazon-Elastic-Container-Service_48.svg` |
| `efs.svg` | `Arch_Amazon-EFS_48.svg` |
| `elastic-load-balancing.svg` | `Arch_Elastic-Load-Balancing_48.svg` |
| `rds.svg` | `Arch_Amazon-RDS_48.svg` |
| `route-53.svg` | `Arch_Amazon-Route-53_48.svg` |
| `secrets-manager.svg` | `Arch_AWS-Secrets-Manager_48.svg` |

The [diagram generator](../cloud-architecture.mjs) embeds these files as data URIs in the output SVG, so viewing or regenerating the diagram requires no network access. ECS icons identify the hosting service for application, RabbitMQ and Debezium tasks; they do not imply Amazon MQ or another managed messaging service. Browsers and NUS SoCLaaS retain neutral symbols.
