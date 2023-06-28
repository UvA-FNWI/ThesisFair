root=$1
cmd=$2

if [[ -z $root ]]; then
  echo "Missing directory parameter"
  exit 1
fi

if [[ -z $cmd ]]; then
  echo "Missing command parameter"
  exit 1
fi

cd $root

for dir in ./*; do
  if [[ ! -e $dir/package.json ]]; then
    continue
  fi

  (cd "$dir" && $cmd)
done
